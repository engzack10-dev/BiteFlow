import type { CartItem } from '../../types/index.js'
import { AvailabilityBadge } from '../common/AvailabilityBadge.js'

interface CartTableProps {
  items: CartItem[]
  onUpdateQuantity: (id: string, delta: number) => void
  onRemoveItem: (id: string) => void
}

export function CartTable({
  items,
  onUpdateQuantity,
  onRemoveItem,
}: CartTableProps) {
  return (
    <div className="cart-table-wrapper">
      <table className="cart-table">
        <thead>
          <tr>
            <th style={{ width: '28%' }}>Name</th>
            <th className="col-center" style={{ width: '18%' }}>Image</th>
            <th className="col-center" style={{ width: '16%' }}>Unit Price</th>
            <th className="col-center" style={{ width: '18%' }}>Quantity</th>
            <th className="col-center" style={{ width: '14%' }}>Total Price</th>
            <th style={{ width: '6%' }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const itemTotal = item.unitPrice * item.quantity
            const isUnavailable = item.isAvailable === false

            return (
              <tr key={item.id} className={isUnavailable ? 'cart-row-unavailable' : ''}>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                    <span className="item-name">{item.name}</span>
                    {isUnavailable && (
                      <AvailabilityBadge isAvailable={false} size="sm" />
                    )}
                  </div>
                </td>
                <td className="col-center">
                  <div className="item-thumb-container">
                    <img
                      src={
                        item.image.startsWith('/') || item.image.startsWith('http')
                          ? item.image
                          : `/${item.image}`
                      }
                      alt={item.name}
                      className="item-thumb"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/delicious-burger.jpg'
                      }}
                    />
                  </div>
                </td>
                <td className="col-center">
                  <span className="item-price">${item.unitPrice.toFixed(2)}</span>
                </td>
                <td className="col-center">
                  <div className="qty-stepper">
                    <button
                      className="qty-btn"
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="qty-number">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="col-center">
                  <span className="item-total-price">${itemTotal.toFixed(2)}</span>
                </td>
                <td className="col-center">
                  <button
                    className="btn-remove"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    &#10005;
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
