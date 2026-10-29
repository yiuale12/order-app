import { useEffect, useState } from 'react'
import './App.css'

const formatPrice = (price) => `${price.toLocaleString('ko-KR')}원`

const menuPresentation = {
  '아메리카노 (ICE)': {
    imageAlt: '얼음과 커피 원두가 담긴 아이스 아메리카노',
    label: 'COZY SIGNATURE',
  },
  '아메리카노 (HOT)': {
    imageAlt: '머그잔에 담긴 따뜻한 블랙 커피',
    label: 'ALL-TIME FAVORITE',
  },
  카페라떼: {
    imageAlt: '라떼 아트가 올려진 카페라떼',
    label: 'SOFT & CREAMY',
  },
}

const statusLabels = {
  received: '주문 접수',
  preparing: '제조 중',
  completed: '제조 완료',
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || '요청을 처리하지 못했습니다.')
  }

  return data
}

function normalizeMenu(menu) {
  return {
    ...menu,
    image: menu.imageUrl,
    imageAlt: menuPresentation[menu.name]?.imageAlt ?? `${menu.name} 커피`,
    label: menuPresentation[menu.name]?.label ?? 'COZY COFFEE',
  }
}

function normalizeOrder(order) {
  return {
    ...order,
    createdAt: order.createdAt,
    status: statusLabels[order.status] ?? order.status,
    items: order.items.map((item) => ({
      ...item,
      options: item.options ?? [],
    })),
  }
}

async function fetchAppData() {
  const [menuData, orderData] = await Promise.all([
    apiRequest('/api/menus'),
    apiRequest('/api/orders'),
  ])
  return {
    products: menuData.map(normalizeMenu),
    orders: orderData.map(normalizeOrder),
  }
}

function getStockStatus(stock) {
  if (stock === 0) return '품절'
  if (stock < 5) return '주의'
  return '정상'
}

function formatOrderDate(date) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(date))
}

function App() {
  const [selectedOptions, setSelectedOptions] = useState({})
  const [menu, setMenu] = useState([])
  const [cart, setCart] = useState([])
  const [notice, setNotice] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [sessionDate] = useState(() => new Date())
  const [currentPage, setCurrentPage] = useState('order')
  const [inventory, setInventory] = useState([])
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)

  async function refreshServerData(showLoading = false) {
    if (showLoading) {
      setIsLoading(true)
      setErrorMessage('')
    }
    try {
      const { products, orders: serverOrders } = await fetchAppData()
      setMenu(products)
      setInventory(
        products.map((product) => ({
          id: product.id,
          name: product.name,
          stock: product.stockQuantity,
        })),
      )
      setOrders(serverOrders)
    } catch (error) {
      setErrorMessage(error.message || '서버에서 데이터를 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        const { products, orders: serverOrders } = await fetchAppData()
        setMenu(products)
        setInventory(
          products.map((product) => ({
            id: product.id,
            name: product.name,
            stock: product.stockQuantity,
          })),
        )
        setOrders(serverOrders)
      } catch (error) {
        setErrorMessage(error.message || '서버에서 데이터를 불러오지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [])

  const cartCount = cart.reduce((count, item) => count + item.quantity, 0)
  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  function toggleOption(menuId, optionId) {
    setSelectedOptions((current) => {
      const options = current[menuId] ?? []
      const nextOptions = options.includes(optionId)
        ? options.filter((id) => id !== optionId)
        : [...options, optionId]

      return { ...current, [menuId]: nextOptions }
    })
  }

  function addToCart(product) {
    const optionIds = [...(selectedOptions[product.id] ?? [])].sort()
    const options = product.options.filter((option) => optionIds.includes(option.id))
    const unitPrice =
      product.price + options.reduce((sum, option) => sum + option.price, 0)
    const key = `${product.id}:${optionIds.join(',')}`

    setCart((current) => {
      const existing = current.find((item) => item.key === key)
      if (existing) {
        return current.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }

      return [
        ...current,
        {
          key,
          menuId: product.id,
          optionIds,
          name: product.name,
          options,
          unitPrice,
          quantity: 1,
        },
      ]
    })
    setNotice('')
    setErrorMessage('')
  }

  function updateQuantity(key, change) {
    setCart((current) =>
      current
        .map((item) =>
          item.key === key
            ? { ...item, quantity: item.quantity + change }
            : item,
        )
        .filter((item) => item.quantity > 0),
    )
    setNotice('')
    setErrorMessage('')
  }

  async function placeOrder() {
    if (cart.length === 0 || isSubmittingOrder) return

    setIsSubmittingOrder(true)
    setNotice('')
    setErrorMessage('')
    try {
      const order = await apiRequest('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map(({ menuId, quantity, optionIds }) => ({
            menuId,
            quantity,
            optionIds,
          })),
        }),
      })
      const latestMenus = (await apiRequest('/api/menus')).map(normalizeMenu)
      setMenu(latestMenus)
      setOrders((current) => [normalizeOrder(order), ...current])
      setCart([])
      setSelectedOptions({})
      setInventory(
        latestMenus.map((product) => ({
          id: product.id,
          name: product.name,
          stock: product.stockQuantity,
        })),
      )
      setNotice('주문이 접수되었습니다! 맛있는 커피를 준비할게요.')
    } catch (error) {
      setErrorMessage(error.message || '주문을 접수하지 못했습니다.')
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  async function adjustStock(menuId, change) {
    setErrorMessage('')
    try {
      const updatedMenu = await apiRequest(`/api/menus/${menuId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ adjustment: change }),
      })
      setInventory((current) =>
        current.map((item) =>
          item.id === menuId ? { ...item, stock: updatedMenu.stockQuantity } : item,
        ),
      )
    } catch (error) {
      setErrorMessage(error.message || '재고를 변경하지 못했습니다.')
    }
  }

  async function updateOrderStatus(orderId, status) {
    const apiStatus = Object.entries(statusLabels).find(([, label]) => label === status)?.[0]
    if (!apiStatus) return

    setErrorMessage('')
    try {
      const updatedOrder = await apiRequest(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: apiStatus }),
      })
      const normalizedOrder = normalizeOrder(updatedOrder)
      setOrders((current) =>
        current.map((order) => (order.id === orderId ? normalizedOrder : order)),
      )
    } catch (error) {
      setErrorMessage(error.message || '주문 상태를 변경하지 못했습니다.')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="COZY 홈">
          <span className="brand-mark" aria-hidden="true">
            <CoffeeIcon />
          </span>
          <span className="brand-word">COZY<span>.</span></span>
        </a>
        <nav className="main-nav" aria-label="주요 메뉴">
          <a
            className={`nav-link ${currentPage === 'order' ? 'active' : ''}`}
            href="#order"
            aria-current={currentPage === 'order' ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              setCurrentPage('order')
            }}
          >
            주문하기
          </a>
          <a
            className={`nav-link ${currentPage === 'admin' ? 'active' : ''}`}
            href="#admin"
            aria-current={currentPage === 'admin' ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault()
              setCurrentPage('admin')
              refreshServerData(true)
            }}
          >
            관리자
          </a>
          {currentPage === 'order' && (
            <a className="nav-cart" href="#cart" aria-label={`장바구니 ${cartCount}개`}>
              <CartIcon />
              <span>{cartCount}</span>
            </a>
          )}
        </nav>
      </header>

      {errorMessage && (
        <div className="api-error" role="alert">
          {errorMessage}
        </div>
      )}

      {currentPage === 'order' ? (
        <main id="order" className="page-content">
        <section className="intro">
          <div className="intro-copy">
            <span className="eyebrow"><span /> A LITTLE COFFEE, A LOT OF COMFORT</span>
            <h1>오늘의 기분에<br />꼭 맞는 <em>커피 한 잔.</em></h1>
            <p>천천히 고른 한 잔이 하루를 조금 더 포근하게 만들어줘요.</p>
          </div>
          <div className="intro-note">
            <span className="note-star">✳</span>
            <span>FRESHLY BREWED<br />JUST FOR YOU</span>
          </div>
        </section>

        <section className="menu-section" aria-labelledby="menu-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">GOOD COFFEE, GOOD DAY</span>
              <h2 id="menu-title">COZY의 커피 <span>{menu.length}</span></h2>
            </div>
            <span className="menu-note">매일 신선하게 준비해요 <span aria-hidden="true">↗</span></span>
          </div>

          <div className="menu-grid">
            {isLoading ? (
              <div className="empty-menu">메뉴를 불러오는 중이에요.</div>
            ) : menu.length === 0 ? (
              <div className="empty-menu">지금은 준비된 메뉴가 없어요. 잠시 후 다시 찾아주세요.</div>
            ) : (
              menu.map((product, index) => (
                <article className="menu-card" key={product.id}>
                  <div className="menu-photo">
                    <img src={product.image} alt={product.imageAlt} />
                    <span className="photo-index">0{index + 1} / 0{menu.length}</span>
                    <span className="photo-label">{product.label}</span>
                  </div>
                  <div className="menu-card-content">
                    <div className="product-heading">
                      <h3>{product.name}</h3>
                      <span className="product-price">{formatPrice(product.price)}</span>
                    </div>
                    <p className="product-description">{product.description}</p>
                    <div className="option-list" aria-label={`${product.name} 추가 옵션`}>
                      {product.options.map((option) => (
                        <label className="option-row" key={option.id}>
                          <input
                            checked={(selectedOptions[product.id] ?? []).includes(option.id)}
                            onChange={() => toggleOption(product.id, option.id)}
                            type="checkbox"
                          />
                          <span className="option-name">{option.name}</span>
                          <span className="option-price">
                            {option.price > 0 ? `+${formatPrice(option.price)}` : '무료'}
                          </span>
                        </label>
                      ))}
                    </div>
                    <button
                      className="add-button"
                      onClick={() => addToCart(product)}
                      type="button"
                    >
                      <span>장바구니에 담기</span>
                      <span className="add-arrow" aria-hidden="true">↗</span>
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="cart-panel" id="cart" aria-labelledby="cart-title">
          <div className="cart-main">
            <div className="cart-heading">
              <span className="section-kicker">YOUR COZY MOMENT</span>
              <h2 id="cart-title">장바구니 <span>{cartCount}</span></h2>
            </div>

            {notice && (
              <div className="order-notice" role="status">
                <span className="notice-check">✓</span>
                <span>{notice}</span>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="cart-empty">
                <span className="empty-cup"><CoffeeIcon /></span>
                <span>아직 담긴 메뉴가 없어요. 오늘의 커피를 골라보세요.</span>
              </div>
            ) : (
              <ul className="cart-items">
                {cart.map((item) => (
                  <li className="cart-item" key={item.key}>
                    <div className="cart-item-detail">
                      <span className="cart-item-name">{item.name}</span>
                      <span className="cart-item-options">
                        {item.options.length > 0
                          ? item.options.map((option) => option.name).join(' · ')
                          : '기본'}
                      </span>
                    </div>
                    <div className="quantity-control" aria-label={`${item.name} 수량`}>
                      <button
                        aria-label={`${item.name} 수량 줄이기`}
                        onClick={() => updateQuantity(item.key, -1)}
                        type="button"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label={`${item.name} 수량 늘리기`}
                        onClick={() => updateQuantity(item.key, 1)}
                        type="button"
                      >
                        +
                      </button>
                    </div>
                    <strong className="cart-item-total">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="cart-summary">
            <div className="summary-top">
              <span>총 주문 금액</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <button
              className="order-button"
              disabled={cart.length === 0 || isSubmittingOrder}
              onClick={placeOrder}
              type="button"
            >
              {isSubmittingOrder ? '접수 중...' : '주문하기'} <span aria-hidden="true">→</span>
            </button>
            <p>결제 없이 주문을 접수합니다.</p>
          </aside>
        </section>

        <footer className="page-footer">
          <span>COZY<span>.</span> COFFEE SHOP</span>
          <span>천천히, 따뜻하게, COZY.</span>
        </footer>
        </main>
      ) : (
        <main id="admin" className="page-content admin-page">
          <AdminDashboard
            inventory={inventory}
            orders={orders}
            today={sessionDate}
            onAdjustStock={adjustStock}
            onUpdateOrderStatus={updateOrderStatus}
            isLoading={isLoading}
          />
          <footer className="page-footer">
            <span>COZY<span>.</span> COFFEE SHOP</span>
            <span>천천히, 따뜻하게, COZY.</span>
          </footer>
        </main>
      )}
    </div>
  )
}

function AdminDashboard({
  inventory,
  orders,
  today,
  onAdjustStock,
  onUpdateOrderStatus,
  isLoading,
}) {
  const metrics = [
    { label: '총 주문', value: orders.length, icon: '01', tone: 'total' },
    {
      label: '주문 접수',
      value: orders.filter((order) => order.status === '주문 접수').length,
      icon: '02',
      tone: 'received',
    },
    {
      label: '제조 중',
      value: orders.filter((order) => order.status === '제조 중').length,
      icon: '03',
      tone: 'making',
    },
    {
      label: '제조 완료',
      value: orders.filter((order) => order.status === '제조 완료').length,
      icon: '04',
      tone: 'completed',
    },
  ]

  return (
    <div className="admin-page-content">
      <section className="admin-intro">
        <div>
          <span className="eyebrow"><span /> COZY STORE MANAGEMENT</span>
          <h1>관리자 <em>대시보드</em></h1>
          <p>오늘의 주문과 매장 재고를 한눈에 확인하세요.</p>
        </div>
        <span className="admin-date">
          <span>오늘</span>
          {new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          }).format(today)}
        </span>
      </section>

      <section className="admin-section" aria-labelledby="dashboard-title">
        <div className="section-heading admin-section-heading">
          <div>
            <span className="section-kicker">AT A GLANCE</span>
            <h2 id="dashboard-title">관리자 대시보드</h2>
          </div>
          <span className="admin-section-note">주문 현황 요약</span>
        </div>
        <div className="dashboard-grid">
          {metrics.map((metric) => (
            <article className={`metric-card metric-${metric.tone}`} key={metric.label}>
              <div className="metric-card-top">
                <span>{metric.label}</span>
                <span className="metric-number">{metric.icon}</span>
              </div>
              <div className="metric-value">
                {metric.value}<span>건</span>
              </div>
              <div className="metric-card-bottom">
                <span className="metric-dot" />
                {metric.label === '총 주문' ? '전체 주문' : '현재 상태'}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-section inventory-section" aria-labelledby="inventory-title">
        <div className="section-heading admin-section-heading">
          <div>
            <span className="section-kicker">STOCK STATUS</span>
            <h2 id="inventory-title">재고 현황 <span>{inventory.length}</span></h2>
          </div>
          <span className="admin-section-note">재고를 1개씩 조정할 수 있어요.</span>
        </div>
        <div className="inventory-grid">
          {isLoading ? (
            <div className="empty-menu">재고를 불러오는 중이에요.</div>
          ) : inventory.map((item) => {
            const status = getStockStatus(item.stock)
            return (
              <article className="inventory-card" key={item.id}>
                <div className="inventory-card-content">
                  <div className="inventory-stock-row">
                    <h3>{item.name}</h3>
                    <div className="stock-count">
                      <strong>{item.stock}</strong>
                      <span>개</span>
                    </div>
                    <span className={`stock-status status-${status === '정상' ? 'normal' : status === '주의' ? 'warning' : 'sold-out'}`}>
                      <span />
                      {status}
                    </span>
                  </div>
                  <div className="stock-controls" aria-label={`${item.name} 재고 조절`}>
                    <button
                      aria-label={`${item.name} 재고 감소`}
                      disabled={item.stock === 0}
                      onClick={() => onAdjustStock(item.id, -1)}
                      type="button"
                    >
                      −
                    </button>
                    <button
                      aria-label={`${item.name} 재고 증가`}
                      onClick={() => onAdjustStock(item.id, 1)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="admin-section orders-section" aria-labelledby="orders-title">
        <div className="section-heading admin-section-heading">
          <div>
            <span className="section-kicker">ORDER MANAGEMENT</span>
            <h2 id="orders-title">주문 현황 <span>{orders.length}</span></h2>
          </div>
          <span className="admin-section-note">접수된 순서대로 표시합니다.</span>
        </div>
        {orders.length === 0 ? (
          <div className="admin-empty-orders">
            <span className="empty-order-mark">✓</span>
            <strong>아직 접수된 주문이 없어요.</strong>
            <span>새 주문이 들어오면 이곳에서 확인할 수 있어요.</span>
          </div>
        ) : (
          <div className="order-list">
            {orders.map((order) => {
              const nextStatus =
                order.status === '주문 접수'
                  ? '제조 중'
                  : order.status === '제조 중'
                    ? '제조 완료'
                    : null
              return (
                <article className="admin-order-card" key={order.id}>
                  <div className="order-number">
                    <span>ORDER</span>
                    <strong>#{String(order.id).padStart(3, '0')}</strong>
                  </div>
                  <div className="admin-order-detail">
                    <div className="order-meta">
                      <time dateTime={new Date(order.createdAt).toISOString()}>
                        {formatOrderDate(order.createdAt)}
                      </time>
                      <span className={`order-status status-${order.status === '주문 접수' ? 'received' : order.status === '제조 중' ? 'making' : 'completed'}`}>
                        <span />
                        {order.status}
                      </span>
                    </div>
                    <ul className="admin-order-items">
                      {order.items.map((item, itemIndex) => (
                        <li key={`${item.name}-${itemIndex}`}>
                          <span className="admin-order-item-name">{item.name}</span>
                          {item.options.length > 0 && (
                            <span className="admin-order-item-options">
                              {item.options.map((option) => option.name).join(' · ')}
                            </span>
                          )}
                          <span className="admin-order-item-quantity">× {item.quantity}</span>
                          <strong>{formatPrice(item.unitPrice * item.quantity)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="admin-order-actions">
                    <strong className="admin-order-total">{formatPrice(order.total)}</strong>
                    {nextStatus ? (
                      <button
                        className="status-action"
                        onClick={() => onUpdateOrderStatus(order.id, nextStatus)}
                        type="button"
                      >
                        {nextStatus === '제조 중' ? '제조 시작' : '제조 완료'}
                        <span aria-hidden="true">→</span>
                      </button>
                    ) : (
                      <span className="order-done">처리가 완료되었어요</span>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function CoffeeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M4.5 9h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9Z" />
      <path d="M16.5 11h1.7a2.3 2.3 0 0 1 0 4.6h-2M3 21h16M8 5c0-1 1-1.2 1-2.5M12 5c0-1 1-1.2 1-2.5" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.6L21 8H6" />
      <circle cx="10" cy="20" r="1.2" />
      <circle cx="18" cy="20" r="1.2" />
    </svg>
  )
}

export default App
