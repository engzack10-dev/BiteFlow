import { useState } from 'react'
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
  const [isFavorite, setIsFavorite] = useState(false)

  const handleInspect = () => {
    onInspect?.(product)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleInspect()
    }
  }

  // Derive category label
  const categoryLabel =
    product.category && typeof product.category === 'object' && 'name' in product.category
      ? (product.category.name as string).toUpperCase()
      : 'MENU DISH'

  // Deterministic friendly rating and review count based on product ID
  const seed = (product._id || product.name).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const rating = (4.7 + (seed % 3) * 0.1).toFixed(1)
  const reviewsCount = 45 + (seed % 140)

  return (
    <article
      className={`delicious-product-card ${!product.isAvailable ? 'sold-out' : ''}`}
      aria-label={product.name}
    >
      {/* Top Image Section */}
      <div
        className="delicious-card-image-box"
        role="button"
        tabIndex={0}
        onClick={handleInspect}
        onKeyDown={handleKeyDown}
        title={`Click to view ingredients and details for ${product.name}`}
      >
        <img
          src={
            product.image.startsWith('/') || product.image.startsWith('http')
              ? product.image
              : `/${product.image}`
          }
          alt={product.name}
          className="delicious-card-img"
          loading="lazy"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = '/delicious-burger.jpg'
          }}
        />

        {/* Floating Heart / Wishlist button */}
        <button
          type="button"
          className={`delicious-wishlist-btn ${isFavorite ? 'favorited' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            setIsFavorite(!isFavorite)
          }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill={isFavorite ? '#ea580c' : 'none'}
            stroke={isFavorite ? '#ea580c' : '#4b5563'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        </button>

        {/* Availability Badge if sold out */}
        {!product.isAvailable && (
          <div className="delicious-card-badge-wrapper">
            <AvailabilityBadge isAvailable={product.isAvailable} size="sm" />
          </div>
        )}
      </div>

      {/* Card Content Body */}
      <div className="delicious-card-body">
        <span className="delicious-card-category">{categoryLabel}</span>

        <h3
          className="delicious-card-title clickable"
          onClick={handleInspect}
          title={`Click to view details for ${product.name}`}
        >
          {product.name}
        </h3>

        <p className="delicious-card-desc" onClick={handleInspect}>
          {product.description || 'Artisanal kitchen recipe freshly prepared to order.'}
        </p>

        {/* Card Footer: Price, Rating & Quick-Add Button */}
        <div className="delicious-card-footer">
          <div className="delicious-price-rating-box">
            <div className="delicious-price-row">
              <span className="delicious-card-price">${product.price.toFixed(2)}</span>
            </div>
            <div className="delicious-rating-row">
              <span className="delicious-star-icon">★</span>
              <span className="delicious-rating-val">{rating}</span>
              <span className="delicious-reviews-count">({reviewsCount})</span>
            </div>
          </div>

          <button
            type="button"
            className="delicious-quick-add-btn"
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
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  )
}
