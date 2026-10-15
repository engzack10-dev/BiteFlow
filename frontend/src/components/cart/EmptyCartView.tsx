interface EmptyCartViewProps {
  onBrowseMenu: () => void
}

export function EmptyCartView({ onBrowseMenu }: EmptyCartViewProps) {
  return (
    <div className="empty-cart-view">
      <div className="empty-cart-icon">🛒</div>
      <h2 className="empty-cart-title">Your cart is currently empty</h2>
      <p className="empty-cart-desc">
        Browse our chef's signature selections and add delicious dishes to your order.
      </p>
      <button className="btn-action btn-continue" onClick={onBrowseMenu}>
        Browse Menu
      </button>
    </div>
  )
}
