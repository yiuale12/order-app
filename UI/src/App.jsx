import { useState } from 'react'
import './App.css'

const menu = [
  {
    id: 'americano-ice',
    name: '아메리카노 (ICE)',
    description: '맑고 산뜻하게, 매일 마시고 싶은 아이스 커피.',
    price: 4000,
    image: '/images/americano-ice.svg',
    imageAlt: '얼음과 커피 원두가 담긴 아이스 아메리카노',
    label: 'COZY SIGNATURE',
    options: [
      { id: 'shot', name: '샷 추가', price: 500 },
      { id: 'syrup', name: '시럽 추가', price: 0 },
    ],
  },
  {
    id: 'americano-hot',
    name: '아메리카노 (HOT)',
    description: '고소한 원두의 깊은 향을 따뜻하게 즐겨보세요.',
    price: 4000,
    image: '/images/americano-hot.svg',
    imageAlt: '머그잔에 담긴 따뜻한 블랙 커피',
    label: 'ALL-TIME FAVORITE',
    options: [
      { id: 'shot', name: '샷 추가', price: 500 },
      { id: 'syrup', name: '시럽 추가', price: 0 },
    ],
  },
  {
    id: 'cafe-latte',
    name: '카페라떼',
    description: '에스프레소와 부드러운 우유가 만난 포근한 한 잔.',
    price: 5000,
    image: '/images/cafe-latte.svg',
    imageAlt: '라떼 아트가 올려진 카페라떼',
    label: 'SOFT & CREAMY',
    options: [
      { id: 'shot', name: '샷 추가', price: 500 },
      { id: 'syrup', name: '시럽 추가', price: 0 },
    ],
  },
]

const formatPrice = (price) => `${price.toLocaleString('ko-KR')}원`

function App() {
  const [selectedOptions, setSelectedOptions] = useState({})
  const [cart, setCart] = useState([])
  const [notice, setNotice] = useState('')

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
          name: product.name,
          options,
          unitPrice,
          quantity: 1,
        },
      ]
    })
    setNotice('')
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
  }

  function placeOrder() {
    if (cart.length === 0) return

    setCart([])
    setSelectedOptions({})
    setNotice('주문이 접수되었습니다! 맛있는 커피를 준비할게요. (데모)')
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
          <a className="nav-link active" href="#order" aria-current="page">
            주문하기
          </a>
          <a className="nav-link" href="#admin" onClick={(event) => event.preventDefault()}>
            관리자
          </a>
          <a className="nav-cart" href="#cart" aria-label={`장바구니 ${cartCount}개`}>
            <CartIcon />
            <span>{cartCount}</span>
          </a>
        </nav>
      </header>

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
            {menu.length === 0 ? (
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
              disabled={cart.length === 0}
              onClick={placeOrder}
              type="button"
            >
              주문하기 <span aria-hidden="true">→</span>
            </button>
            <p>결제 없이 주문을 접수합니다.</p>
          </aside>
        </section>

        <footer className="page-footer">
          <span>COZY<span>.</span> COFFEE SHOP</span>
          <span>천천히, 따뜻하게, COZY.</span>
        </footer>
      </main>
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
