import type { Product } from '../../types/index.js'
import { AvailabilityBadge } from '../common/AvailabilityBadge.js'

interface ProductCardProps {
  product: Product
  onAddToCart: (prod: Product) => void
  onInspect?: (prod: Product) => void
}

export function ProductCard({
  product,
  onAddToCart,
  onInspect,
}: ProductCardProps) {
  const handleInspect = () => {
    onInspect?.(product)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleInspect()
    }
  }

  return (
    <article
      className={`storefront-product-card ${!product.isAvailable ? 'sold-out' : ''}`}
      aria-label={product.name}
    >
      {/* Top half: Light background with food image - clickable for inspecting details */}
      <div
        className="product-card-top"
        role="button"
        tabIndex={0}
        onClick={handleInspect}
        onKeyDown={handleKeyDown}
        title={`Click to view details for ${product.name}`}
        aria-label={`View details for ${product.name}`}
      >
        <div className="product-card-img-container">
          <img
            src={
              product.image.startsWith('/') || product.image.startsWith('http')
                ? product.image
                : `/${product.image}`
            }
            alt={product.name}
            className="product-card-img"
            loading="lazy"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = '/delicious-burger.jpg'
            }}
          />
        </div>
        <div className="product-card-badge-wrapper">
          <AvailabilityBadge isAvailable={product.isAvailable} size="sm" />
        </div>
      </div>

      {/* Bottom half: Dark container */}
      <div className="product-card-bottom">
        <h3
          className="product-card-title clickable"
          onClick={handleInspect}
          title={`Click to view details for ${product.name}`}
        >
          {product.name}
        </h3>
        <p className="product-card-desc">{product.description}</p>

        <div className="product-card-footer">
          <span className="product-card-price">${product.price.toFixed(2)}</span>

          <button
            className="product-card-cart-btn"
            disabled={!product.isAvailable}
            onClick={() => onAddToCart(product)}
            title={
              product.isAvailable
                ? `Add ${product.name} to cart`
                : 'Item currently unavailable'
            }
            aria-label={
              product.isAvailable
                ? `Add ${product.name} to cart`
                : 'Item currently unavailable'
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  )
}
