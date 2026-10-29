import { pool } from "./db.js";

const schema = `
  CREATE TABLE IF NOT EXISTS menus (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    price INTEGER NOT NULL CHECK (price >= 0),
    image_url TEXT NOT NULL DEFAULT '',
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS options (
    id SERIAL PRIMARY KEY,
    menu_id INTEGER NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (menu_id, name)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'received'
      CHECK (status IN ('received', 'preparing', 'completed')),
    total_amount INTEGER NOT NULL CHECK (total_amount >= 0)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_id INTEGER REFERENCES menus(id) ON DELETE SET NULL,
    menu_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
    line_amount INTEGER NOT NULL CHECK (line_amount >= 0)
  );

  CREATE TABLE IF NOT EXISTS order_item_options (
    id BIGSERIAL PRIMARY KEY,
    order_item_id BIGINT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    option_id INTEGER REFERENCES options(id) ON DELETE SET NULL,
    option_name TEXT NOT NULL,
    unit_price INTEGER NOT NULL CHECK (unit_price >= 0)
  );
`;

const seedMenus = [
  {
    name: "아메리카노 (ICE)",
    description: "맑고 산뜻하게, 매일 마시고 싶은 아이스 커피.",
    price: 4000,
    imageUrl: "/images/americano-ice.svg",
    stock: 10,
  },
  {
    name: "아메리카노 (HOT)",
    description: "고소한 원두의 깊은 향을 따뜻하게 즐겨보세요.",
    price: 4000,
    imageUrl: "/images/americano-hot.svg",
    stock: 10,
  },
  {
    name: "카페라떼",
    description: "에스프레소와 부드러운 우유가 만난 포근한 한 잔.",
    price: 5000,
    imageUrl: "/images/cafe-latte.svg",
    stock: 10,
  },
];

export async function initializeDatabase() {
  await pool.query(schema);

  for (const menu of seedMenus) {
    const result = await pool.query(
      `INSERT INTO menus (name, description, price, image_url, stock_quantity)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (name) DO NOTHING
       RETURNING id`,
      [menu.name, menu.description, menu.price, menu.imageUrl, menu.stock],
    );

    const menuId =
      result.rows[0]?.id ??
      (
        await pool.query("SELECT id FROM menus WHERE name = $1", [menu.name])
      ).rows[0].id;

    for (const option of [
      { name: "샷 추가", price: 500 },
      { name: "시럽 추가", price: 0 },
    ]) {
      await pool.query(
        `INSERT INTO options (menu_id, name, price)
         VALUES ($1, $2, $3)
         ON CONFLICT (menu_id, name) DO NOTHING`,
        [menuId, option.name, option.price],
      );
    }
  }
}
