import { useEffect, useRef } from 'react'
import type { CartItem } from '../../types/index.js'
import { formatCurrency } from '../../utils/cartCalculations.js'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  subtotal: number
  grandTotal: number
  totalUnitCount: number
  hasUnavailableItems: boolean
  onUpdateQuantity: (id: string, delta: number) => void
  onRemoveItem: (id: string) => void
  onCheckout: () => void
  onBrowseMenu: () => void
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  subtotal,
  grandTotal,
  totalUnitCount,
  hasUnavailableItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onBrowseMenu,
}: CartDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

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

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleCheckoutClick = () => {
    if (hasUnavailableItems || items.length === 0) return
    onClose()
    onCheckout()
  }

  const handleContinueShopping = () => {
    onClose()
    onBrowseMenu()
  }

  const getNormalizedImage = (imagePath?: string) => {
    if (!imagePath) return '/delicious-burger.jpg'
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath
    if (imagePath.startsWith('/')) return imagePath
    return `/${imagePath}`
  }

  return (
    <div
      className="cart-drawer-overlay"
      onClick={onClose}
      role="presentation"
    >
      <aside
        ref={drawerRef}
        className="cart-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart Drawer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="cart-drawer-header">
          <div className="drawer-title-group">
            <h2 className="drawer-title">Shopping Cart</h2>
            <span className="drawer-count-badge" aria-label={`${totalUnitCount} items in cart`}>
              {totalUnitCount} {totalUnitCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close cart drawer"
            title="Close cart (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Drawer Body */}
        <div className="cart-drawer-body">
          {items.length === 0 ? (
            <div className="drawer-empty-state">
              <div className="drawer-empty-icon" aria-hidden="true">🛒</div>
              <h3 className="drawer-empty-heading">Your cart is empty</h3>
              <p className="drawer-empty-desc">
                Looks like you haven't added any dishes yet. Discover our live kitchen specialties and build your feast!
              </p>
              <button
                type="button"
                className="btn-action btn-continue drawer-empty-btn"
                onClick={handleContinueShopping}
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <ul className="drawer-items-list" aria-label="Cart Items">
              {items.map((item) => {
                const isUnavailable = item.isAvailable === false
                const itemSubtotal = item.unitPrice * item.quantity

                return (
                  <li
                    key={item.id}
                    className={`drawer-item-card ${isUnavailable ? 'item-unavailable' : ''}`}
                  >
                    <div className="drawer-item-thumb-box">
                      <img
                        src={getNormalizedImage(item.image)}
                        alt={item.name}
                        className="drawer-item-thumb"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = '/delicious-burger.jpg'
                        }}
                      />
                    </div>

                    <div className="drawer-item-details">
                      <div className="drawer-item-top-row">
                        <h4 className="drawer-item-name">{item.name}</h4>
                        <button
                          type="button"
                          className="drawer-item-remove-btn"
                          onClick={() => onRemoveItem(item.id)}
                          aria-label={`Remove ${item.name} from cart`}
                          title={`Remove ${item.name}`}
                        >
                          ✕
                        </button>
                      </div>

                      {isUnavailable && (
                        <div className="drawer-unavailable-alert" role="alert">
                          <span className="unavailable-pill">Sold Out</span>
                          <span className="unavailable-hint">Please remove to checkout</span>
                        </div>
                      )}

                      <div className="drawer-item-bottom-row">
                        <div className="drawer-stepper-box">
                          <button
                            type="button"
                            className="drawer-stepper-btn"
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            aria-label={item.quantity === 1 ? `Remove ${item.name}` : `Decrease quantity of ${item.name}`}
                            title={item.quantity === 1 ? 'Remove item' : 'Decrease quantity'}
                          >
                            –
                          </button>
                          <span
                            className="drawer-stepper-value"
                            aria-live="polite"
                            aria-label={`Quantity: ${item.quantity}`}
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="drawer-stepper-btn"
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            disabled={item.quantity >= 99}
                            aria-label={`Increase quantity of ${item.name}`}
                            title="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <div className="drawer-item-price-col">
                          <span className="drawer-unit-price">
                            {formatCurrency(item.unitPrice)} each
                          </span>
                          <span className="drawer-subtotal-price">
                            {formatCurrency(itemSubtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div className="cart-drawer-footer">
            {hasUnavailableItems && (
              <div className="drawer-warning-banner" role="alert">
                ⚠️ Some items are currently sold out. Please remove them before proceeding to checkout.
              </div>
            )}

            <div className="drawer-totals-box">
              <div className="drawer-totals-row">
                <span className="totals-label">Subtotal</span>
                <span className="totals-value">{formatCurrency(subtotal)}</span>
              </div>
              <div className="drawer-totals-row totals-grand">
                <span className="totals-label">Order Total</span>
                <span className="totals-value-grand">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="drawer-actions-stack">
              <button
                type="button"
                className="btn-drawer-checkout"
                disabled={hasUnavailableItems}
                onClick={handleCheckoutClick}
                title={hasUnavailableItems ? 'Remove unavailable items to checkout' : 'Proceed to checkout'}
              >
                Proceed to Checkout · {formatCurrency(grandTotal)}
              </button>

              <button
                type="button"
                className="btn-drawer-continue"
                onClick={handleContinueShopping}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
