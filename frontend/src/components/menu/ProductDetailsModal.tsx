import { useState, useEffect } from 'react'
import type { Product } from '../../types/index.js'
import { AvailabilityBadge } from '../common/AvailabilityBadge.js'

interface ProductDetailsModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onAddToCart: (product: Product, quantity?: number) => void
}

export function ProductDetailsModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: ProductDetailsModalProps) {
  const [quantity, setQuantity] = useState(1)

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !product) return null

  const categoryName =
    typeof product.category === 'object' && product.category
      ? product.category.name
      : typeof product.category === 'string'
        ? product.category
        : ''

  const handleDecrease = () => {
    setQuantity((prev) => Math.max(1, prev - 1))
  }

  const handleIncrease = () => {
    setQuantity((prev) => Math.min(20, prev + 1))
  }

  const handleAdd = () => {
    if (!product.isAvailable) return
    onAddToCart(product, quantity)
    onClose()
  }

  const totalPrice = (product.price * quantity).toFixed(2)

  return (
    <div
      className="modal-overlay product-details-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div
        className="modal-card product-details-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close product details"
        >
          ✕
        </button>

        <div className="product-details-body">
          {/* Product Image Section */}
          <div className="product-details-media">
            <div className="product-details-img-box">
              <img
                src={
                  product.image.startsWith('/') || product.image.startsWith('http')
                    ? product.image
                    : `/${product.image}`
                }
                alt={product.name}
                className="product-details-img"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = '/delicious-burger.jpg'
                }}
              />
            </div>
            {/* Availability Badge */}
            <div className="product-details-badge-row">
              <AvailabilityBadge isAvailable={product.isAvailable} size="lg" />
              {categoryName && (
                <span className="product-details-category-tag">
                  {categoryName}
                </span>
              )}
            </div>
          </div>

          {/* Product Info Section */}
          <div className="product-details-info">
            <h2 id="product-modal-title" className="product-details-title">
              {product.name}
            </h2>

            <div className="product-details-price-bar">
              <span className="product-details-unit-price">
                ${product.price.toFixed(2)}
              </span>
              <span className="product-details-unit-label">per serving</span>
            </div>

            <div className="product-details-desc-box">
              <h4 className="product-details-subhead">Description</h4>
              <p className="product-details-description">
                {product.description ||
                  'Crafted with the finest, fresh ingredients, prepared to perfection by our expert chefs.'}
              </p>
            </div>

            {/* Purchase Controls Section */}
            <div className="product-details-purchase-box">
              {product.isAvailable ? (
                <>
                  <div className="quantity-selector-row">
                    <label className="quantity-label">Quantity:</label>
                    <div className="quantity-stepper">
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={handleDecrease}
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        –
                      </button>
                      <span className="stepper-value" aria-live="polite">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={handleIncrease}
                        disabled={quantity >= 20}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="product-details-action-row">
                    <button
                      type="button"
                      className="btn-add-to-cart-large"
                      onClick={handleAdd}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                        style={{ marginRight: '0.5rem' }}
                      >
                        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                      Add to Cart · ${totalPrice}
                    </button>
                  </div>
                </>
              ) : (
                <div className="product-soldout-notice">
                  <p className="soldout-text">
                    This item is currently sold out and cannot be added to your order.
                  </p>
                  <button
                    type="button"
                    className="btn-add-to-cart-large btn-disabled"
                    disabled
                  >
                    Unavailable / Sold Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
