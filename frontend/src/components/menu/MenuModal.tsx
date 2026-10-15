import type { Category, Product } from '../../types/index.js'

interface MenuModalProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  selectedCategoryFilter: string
  onSelectCategoryFilter: (catId: string) => void
  products: Product[]
  isLoadingMenu: boolean
  onAddToCart: (prod: Product) => void
}

export function MenuModal({
  isOpen,
  onClose,
  categories,
  selectedCategoryFilter,
  onSelectCategoryFilter,
  products,
  isLoadingMenu,
  onAddToCart,
}: MenuModalProps) {
  if (!isOpen) return null

  const displayedMenuProducts = products.filter((prod) => {
    if (selectedCategoryFilter === 'all') return true
    const catId = typeof prod.category === 'object' ? prod.category._id : prod.category
    return catId === selectedCategoryFilter
  })

  const priority = ['pizza', 'burger', 'chicken']
  const orderedCategories = [...categories].sort((a, b) => {
    const aIndex = priority.indexOf(a.name.toLowerCase())
    const bIndex = priority.indexOf(b.name.toLowerCase())
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close menu modal"
        >
          &#10005;
        </button>
        <h3 className="modal-title">Our Restaurant Menu</h3>
        <p className="modal-subtitle">Handcrafted dishes fresh from BiteFlow kitchen</p>

        {/* Category Filter Pills */}
        <div className="category-pills-row">
          <button
            className={`category-pill ${selectedCategoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => onSelectCategoryFilter('all')}
          >
            All
          </button>
          {orderedCategories.map((c) => (
            <button
              key={c._id}
              className={`category-pill ${selectedCategoryFilter === c._id ? 'active' : ''}`}
              onClick={() => onSelectCategoryFilter(c._id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Products List from Backend */}
        {isLoadingMenu ? (
          <p style={{ textAlign: 'center', padding: '2rem 0', color: '#6b7280' }}>
            Loading fresh menu...
          </p>
        ) : (
          <div className="menu-add-list" style={{ maxHeight: '380px' }}>
            {displayedMenuProducts.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem 0', color: '#6b7280' }}>
                No products found in this category.
              </p>
            ) : (
              displayedMenuProducts.map((prod) => (
                <div
                  key={prod._id}
                  className="menu-add-item"
                  style={{
                    opacity: prod.isAvailable ? 1 : 0.6,
                    background: prod.isAvailable ? '#ffffff' : '#f9fafb',
                  }}
                >
                  <div className="menu-add-info">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="menu-add-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/delicious-burger.jpg'
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="menu-add-name">{prod.name}</span>
                        {!prod.isAvailable && (
                          <span
                            className="status-badge unavailable"
                            style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}
                          >
                            Sold Out
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: '#6b7280',
                          margin: '0.15rem 0',
                        }}
                      >
                        {prod.description}
                      </div>
                      <div className="menu-add-price">${prod.price.toFixed(2)}</div>
                    </div>
                  </div>

                  {/* Unavailable products cannot be added */}
                  <button
                    className="btn-add-item"
                    disabled={!prod.isAvailable}
                    style={{
                      opacity: prod.isAvailable ? 1 : 0.4,
                      cursor: prod.isAvailable ? 'pointer' : 'not-allowed',
                      backgroundColor: prod.isAvailable ? 'var(--btn-teal)' : '#9ca3af',
                    }}
                    onClick={() => onAddToCart(prod)}
                  >
                    {prod.isAvailable ? '+ Add' : 'Unavailable'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <button
          className="btn-action btn-continue"
          style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
          onClick={onClose}
        >
          Back to Shopping Cart
        </button>
      </div>
    </div>
  )
}
