import { Router } from "express";
import { pool } from "./db.js";

const router = Router();
const allowedStatuses = new Set(["received", "preparing", "completed"]);
const nextStatus = {
  received: "preparing",
  preparing: "completed",
};

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function normalizeOrder(row) {
  return {
    id: Number(row.id),
    createdAt: row.ordered_at,
    status: row.status,
    total: row.total_amount,
    items: [],
  };
}

async function fetchOrders(connection, orderId) {
  const values = orderId === undefined ? [] : [orderId];
  const filter = orderId === undefined ? "" : "WHERE o.id = $1";
  const result = await connection.query(
    `SELECT
       o.id AS order_id,
       o.ordered_at,
       o.status,
       o.total_amount,
       oi.id AS item_id,
       oi.menu_name,
       oi.quantity,
       oi.unit_price,
       oi.line_amount,
       oio.option_id,
       oio.option_name,
       oio.unit_price AS option_price
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN order_item_options oio ON oio.order_item_id = oi.id
     ${filter}
     ORDER BY o.ordered_at DESC, o.id DESC, oi.id, oio.id`,
    values,
  );

  const orders = new Map();
  for (const row of result.rows) {
    let order = orders.get(row.order_id);
    if (!order) {
      order = normalizeOrder({
        id: row.order_id,
        ordered_at: row.ordered_at,
        status: row.status,
        total_amount: row.total_amount,
      });
      orders.set(row.order_id, order);
    }

    if (row.item_id === null) continue;

    let item = order.items.find((entry) => entry.id === Number(row.item_id));
    if (!item) {
      item = {
        id: Number(row.item_id),
        name: row.menu_name,
        quantity: row.quantity,
        unitPrice: row.unit_price,
        lineAmount: row.line_amount,
        options: [],
      };
      order.items.push(item);
    }

    if (row.option_id !== null) {
      item.options.push({
        id: row.option_id,
        name: row.option_name,
        price: row.option_price,
      });
    }
  }

  return [...orders.values()];
}

router.get("/menus", async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT
         m.id, m.name, m.description, m.price, m.image_url,
         m.stock_quantity, m.is_available,
         COALESCE(
           json_agg(
             json_build_object('id', op.id, 'name', op.name, 'price', op.price)
             ORDER BY op.id
           ) FILTER (WHERE op.id IS NOT NULL AND op.is_available),
           '[]'::json
         ) AS options
       FROM menus m
       LEFT JOIN options op ON op.menu_id = m.id
       WHERE m.is_available = TRUE
       GROUP BY m.id
       ORDER BY m.id`,
    );

    response.json(
      result.rows.map((menu) => ({
        id: menu.id,
        name: menu.name,
        description: menu.description,
        price: menu.price,
        imageUrl: menu.image_url,
        stockQuantity: menu.stock_quantity,
        isAvailable: menu.is_available,
        options: menu.options,
      })),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/orders", async (request, response, next) => {
  const { items } = request.body ?? {};
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 100 ||
    items.some(
      (item) =>
        !item ||
        !isPositiveInteger(item.menuId) ||
        !isPositiveInteger(item.quantity) ||
        item.quantity > 1000 ||
        !Array.isArray(item.optionIds) ||
        item.optionIds.length > 20 ||
        item.optionIds.some((id) => !isPositiveInteger(id)) ||
        new Set(item.optionIds).size !== item.optionIds.length,
    )
  ) {
    return response.status(400).json({ error: "주문 항목을 확인해 주세요." });
  }

  const groupedItems = new Map();
  for (const item of items) {
    const optionIds = [...item.optionIds].sort((a, b) => a - b);
    const key = `${item.menuId}:${optionIds.join(",")}`;
    const existing = groupedItems.get(key);
    if (existing) existing.quantity += item.quantity;
    else groupedItems.set(key, { ...item, optionIds });
  }

  const normalizedItems = [...groupedItems.values()];
  const menuIds = [...new Set(normalizedItems.map((item) => item.menuId))].sort(
    (a, b) => a - b,
  );
  const connection = await pool.connect();

  try {
    await connection.query("BEGIN");
    const menuResult = await connection.query(
      `SELECT id, name, price, stock_quantity, is_available
       FROM menus
       WHERE id = ANY($1::int[])
       ORDER BY id
       FOR UPDATE`,
      [menuIds],
    );
    const menus = new Map(menuResult.rows.map((menu) => [menu.id, menu]));
    if (menus.size !== menuIds.length) {
      throw new ApiError(404, "주문할 메뉴를 찾을 수 없습니다.");
    }

    const optionIds = [
      ...new Set(normalizedItems.flatMap((item) => item.optionIds)),
    ];
    const optionResult =
      optionIds.length === 0
        ? { rows: [] }
        : await connection.query(
            `SELECT id, menu_id, name, price, is_available
             FROM options
             WHERE id = ANY($1::int[])`,
            [optionIds],
          );
    const options = new Map(optionResult.rows.map((option) => [option.id, option]));
    if (options.size !== optionIds.length) {
      throw new ApiError(400, "선택한 옵션을 찾을 수 없습니다.");
    }

    const quantityByMenu = new Map();
    const resolvedItems = normalizedItems.map((item) => {
      const menu = menus.get(item.menuId);
      if (!menu.is_available) {
        throw new ApiError(409, `${menu.name} 메뉴는 현재 주문할 수 없습니다.`);
      }

      const selectedOptions = item.optionIds.map((optionId) => {
        const option = options.get(optionId);
        if (
          !option.is_available ||
          option.menu_id !== item.menuId
        ) {
          throw new ApiError(400, "선택한 옵션이 해당 메뉴에 연결되어 있지 않습니다.");
        }
        return option;
      });

      quantityByMenu.set(
        item.menuId,
        (quantityByMenu.get(item.menuId) ?? 0) + item.quantity,
      );

      const unitPrice =
        menu.price +
        selectedOptions.reduce((sum, option) => sum + option.price, 0);

      return {
        ...item,
        menu,
        selectedOptions,
        unitPrice,
        lineAmount: unitPrice * item.quantity,
      };
    });

    for (const [menuId, quantity] of quantityByMenu) {
      const menu = menus.get(menuId);
      if (menu.stock_quantity < quantity) {
        throw new ApiError(
          409,
          `${menu.name} 재고가 부족합니다. (현재 ${menu.stock_quantity}개)`,
        );
      }
    }

    for (const [menuId, quantity] of quantityByMenu) {
      await connection.query(
        `UPDATE menus
         SET stock_quantity = stock_quantity - $1, updated_at = NOW()
         WHERE id = $2`,
        [quantity, menuId],
      );
    }

    const total = resolvedItems.reduce((sum, item) => sum + item.lineAmount, 0);
    const orderResult = await connection.query(
      `INSERT INTO orders (total_amount) VALUES ($1)
       RETURNING id, ordered_at, status, total_amount`,
      [total],
    );
    const order = orderResult.rows[0];
    const createdOrder = {
      id: Number(order.id),
      createdAt: order.ordered_at,
      status: order.status,
      total: order.total_amount,
      items: resolvedItems.map((item) => ({
        name: item.menu.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineAmount: item.lineAmount,
        options: item.selectedOptions.map((option) => ({
          id: option.id,
          name: option.name,
          price: option.price,
        })),
      })),
    };

    for (const item of resolvedItems) {
      const itemResult = await connection.query(
        `INSERT INTO order_items
           (order_id, menu_id, menu_name, quantity, unit_price, line_amount)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          order.id,
          item.menu.id,
          item.menu.name,
          item.quantity,
          item.unitPrice,
          item.lineAmount,
        ],
      );
      const orderItemId = itemResult.rows[0].id;

      for (const option of item.selectedOptions) {
        await connection.query(
          `INSERT INTO order_item_options
             (order_item_id, option_id, option_name, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [orderItemId, option.id, option.name, option.price],
        );
      }
    }
    await connection.query("COMMIT");
    await connection.query("COMMIT");
    response.status(201).json(createdOrder);
  } catch (error) {
    await connection.query("ROLLBACK");
    next(error);
  } finally {
    connection.release();
  }
});

router.get("/orders", async (_request, response, next) => {
  try {
    response.json(await fetchOrders(pool));
  } catch (error) {
    next(error);
  }
});

router.get("/orders/:orderId", async (request, response, next) => {
  const orderId = Number(request.params.orderId);
  if (!isPositiveInteger(orderId)) {
    return response.status(400).json({ error: "주문 ID가 올바르지 않습니다." });
  }

  try {
    const [order] = await fetchOrders(pool, orderId);
    if (!order) {
      return response.status(404).json({ error: "주문을 찾을 수 없습니다." });
    }
    response.json(order);
  } catch (error) {
    next(error);
  }
});

router.patch("/orders/:orderId/status", async (request, response, next) => {
  const orderId = Number(request.params.orderId);
  if (!isPositiveInteger(orderId)) {
    return response.status(400).json({ error: "주문 ID가 올바르지 않습니다." });
  }
  if (!allowedStatuses.has(request.body?.status)) {
    return response.status(400).json({ error: "변경할 주문 상태가 올바르지 않습니다." });
  }

  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    const currentResult = await connection.query(
      "SELECT status FROM orders WHERE id = $1 FOR UPDATE",
      [orderId],
    );
    const current = currentResult.rows[0];
    if (!current) throw new ApiError(404, "주문을 찾을 수 없습니다.");
    if (nextStatus[current.status] !== request.body.status) {
      throw new ApiError(409, "주문은 다음 단계 상태로만 변경할 수 있습니다.");
    }

    await connection.query(
      "UPDATE orders SET status = $1 WHERE id = $2",
      [request.body.status, orderId],
    );
    const [order] = await fetchOrders(connection, orderId);
    await connection.query("COMMIT");
    response.json(order);
  } catch (error) {
    await connection.query("ROLLBACK");
    next(error);
  } finally {
    connection.release();
  }
});

router.patch("/menus/:menuId/stock", async (request, response, next) => {
  const menuId = Number(request.params.menuId);
  const { adjustment } = request.body ?? {};
  if (
    !isPositiveInteger(menuId) ||
    !Number.isSafeInteger(adjustment) ||
    adjustment === 0
  ) {
    return response.status(400).json({ error: "재고 변경 요청을 확인해 주세요." });
  }

  try {
    const result = await pool.query(
      `UPDATE menus
       SET stock_quantity = stock_quantity + $1, updated_at = NOW()
       WHERE id = $2 AND stock_quantity + $1 >= 0
       RETURNING id, name, stock_quantity`,
      [adjustment, menuId],
    );

    if (result.rowCount === 0) {
      const exists = await pool.query("SELECT 1 FROM menus WHERE id = $1", [menuId]);
      if (exists.rowCount === 0) {
        throw new ApiError(404, "메뉴를 찾을 수 없습니다.");
      }
      throw new ApiError(409, "재고는 0개 미만으로 변경할 수 없습니다.");
    }

    response.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      stockQuantity: result.rows[0].stock_quantity,
    });
  } catch (error) {
    next(error);
  }
});

export function apiErrorHandler(error, _request, response, _next) {
  if (error instanceof ApiError) {
    response.status(error.status).json({ error: error.message });
    return;
  }

  console.error("API request failed:", error.code || error.message);
  response.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
}

export default router;
