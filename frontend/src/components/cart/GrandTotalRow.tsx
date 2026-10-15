interface GrandTotalRowProps {
  grandTotal: number
  hasUnavailableItems?: boolean
  onContinueShopping: () => void
  onUpdateCart: () => void
  onCheckout: () => void
}

export function GrandTotalRow({
  grandTotal,
  hasUnavailableItems = false,
  onContinueShopping,
  onUpdateCart,
  onCheckout,
}: GrandTotalRowProps) {
  return (
    <>
      <div className="grand-total-row">
        <span className="grand-total-label">Grand Total :-</span>
        <span className="grand-total-amount">${grandTotal.toFixed(2)}</span>
      </div>

      {hasUnavailableItems && (
        <div className="cart-warning-alert" role="alert">
          ⚠️ Some items in your cart are currently sold out. Please remove them before proceeding to checkout.
        </div>
      )}

      <div className="cart-actions-toolbar">
        <button
          className="btn-action btn-continue"
          onClick={onContinueShopping}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Continue Shopping
        </button>

        <button
          className="btn-action btn-update"
          onClick={onUpdateCart}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Update Cart
        </button>

        <button
          className="btn-action btn-checkout"
          disabled={hasUnavailableItems}
          onClick={onCheckout}
          title={hasUnavailableItems ? 'Remove unavailable items to proceed' : 'Proceed to checkout'}
        >
          Checkout
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </>
  )
}
