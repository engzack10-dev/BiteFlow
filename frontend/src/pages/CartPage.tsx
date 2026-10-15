import type { CartItem } from '../types/index.js'
import { CartTable } from '../components/cart/CartTable.js'
import { GrandTotalRow } from '../components/cart/GrandTotalRow.js'
import { EmptyCartView } from '../components/cart/EmptyCartView.js'

interface CartPageProps {
  items: CartItem[]
  grandTotal: number
  hasUnavailableItems?: boolean
  onUpdateQuantity: (id: string, delta: number) => void
  onRemoveItem: (id: string) => void
  onBrowseMenu: () => void
  onUpdateCart: () => void
  onCheckout: () => void
}

export function CartPage({
  items,
  grandTotal,
  hasUnavailableItems = false,
  onUpdateQuantity,
  onRemoveItem,
  onBrowseMenu,
  onUpdateCart,
  onCheckout,
}: CartPageProps) {
  return (
    <div className="cart-container">
      <h1 className="cart-title">Your Shopping Cart</h1>
      <div className="cart-divider"></div>

      {items.length === 0 ? (
        <EmptyCartView onBrowseMenu={onBrowseMenu} />
      ) : (
        <>
          <CartTable
            items={items}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
          />
          <GrandTotalRow
            grandTotal={grandTotal}
            hasUnavailableItems={hasUnavailableItems}
            onContinueShopping={onBrowseMenu}
            onUpdateCart={onUpdateCart}
            onCheckout={onCheckout}
          />
        </>
      )}
    </div>
  )
}
