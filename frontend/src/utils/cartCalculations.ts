import type { CartItem } from '../types/index.js'

/**
 * Sanitizes any raw quantity value into a positive integer between min and max.
 * Prevents NaN, decimals, 0, negative values, and infinite values.
 */
export function sanitizeQuantity(raw: unknown, min = 1, max = 99): number {
  if (typeof raw === 'number') {
    if (Number.isNaN(raw) || !Number.isFinite(raw)) return min
    const integer = Math.floor(raw)
    return Math.max(min, Math.min(max, integer))
  }
  if (typeof raw === 'string') {
    const parsed = parseInt(raw, 10)
    if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return min
    return Math.max(min, Math.min(max, parsed))
  }
  return min
}

/**
 * Calculates item subtotal: unit price * quantity, rounded to 2 decimal places.
 * Avoids floating-point precision issues using cents arithmetic.
 */
export function calculateItemSubtotal(unitPrice: number, quantity: number): number {
  const safeQty = sanitizeQuantity(quantity)
  const safePrice = typeof unitPrice === 'number' && Number.isFinite(unitPrice) ? Math.max(0, unitPrice) : 0
  const cents = Math.round(safePrice * safeQty * 100)
  return cents / 100
}

/**
 * Calculates cart subtotal: sum of all item subtotals, rounded to 2 decimal places.
 */
export function calculateCartSubtotal(items: CartItem[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0
  const totalCents = items.reduce((sum, item) => {
    const itemCents = Math.round(Math.max(0, item.unitPrice) * sanitizeQuantity(item.quantity) * 100)
    return sum + itemCents
  }, 0)
  return totalCents / 100
}

/**
 * Calculates order total. Order total = subtotal + any applicable charges defined.
 * If no additional charges exist, order total equals subtotal.
 */
export function calculateOrderTotal(items: CartItem[], additionalCharges = 0): number {
  const subtotal = calculateCartSubtotal(items)
  const safeCharges = typeof additionalCharges === 'number' && Number.isFinite(additionalCharges) ? Math.max(0, additionalCharges) : 0
  const totalCents = Math.round((subtotal + safeCharges) * 100)
  return totalCents / 100
}

/**
 * Calculates total units count (sum of all quantities) for the cart badge.
 */
export function calculateTotalUnitCount(items: CartItem[]): number {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, item) => sum + sanitizeQuantity(item.quantity), 0)
}

/**
 * Calculates distinct items count.
 */
export function calculateTotalItemCount(items: CartItem[]): number {
  if (!Array.isArray(items)) return 0
  return items.length
}

/**
 * Formats a currency amount to a display string with 2 decimal places.
 */
export function formatCurrency(amount: number, symbol = '$'): string {
  const safeAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
  return `${symbol}${safeAmount.toFixed(2)}`
}
