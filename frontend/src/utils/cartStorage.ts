import type { CartItem, Product } from '../types/index.js'
import { sanitizeQuantity } from './cartCalculations.js'

export const CART_STORAGE_KEY = 'biteflow_cart'

/**
 * Validates and sanitizes a single raw item loaded from storage.
 * Returns null if the item is invalid or missing required identifier.
 */
function sanitizeStoredItem(raw: unknown): CartItem | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Partial<CartItem>

  if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
    return null
  }

  const name = typeof item.name === 'string' && item.name.trim() !== '' ? item.name.trim() : 'Menu Item'
  const image = typeof item.image === 'string' && item.image.trim() !== '' ? item.image.trim() : '/delicious-burger.jpg'
  const unitPrice = typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice) && item.unitPrice >= 0 ? item.unitPrice : 0
  const quantity = sanitizeQuantity(item.quantity)
  const isAvailable = typeof item.isAvailable === 'boolean' ? item.isAvailable : true

  return {
    id: item.id.trim(),
    name,
    image,
    unitPrice,
    quantity,
    isAvailable,
  }
}

/**
 * Loads and validates cart items from localStorage.
 * Handles missing storage, malformed JSON, and corrupted objects gracefully.
 */
export function loadCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return []
  }

  try {
    const rawData = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!rawData) {
      return []
    }

    const parsed = JSON.parse(rawData)
    if (!Array.isArray(parsed)) {
      console.warn('[cartStorage] Stored cart data is not an array; resetting cart.')
      return []
    }

    const validItems: CartItem[] = []
    for (const item of parsed) {
      const sanitized = sanitizeStoredItem(item)
      if (sanitized) {
        validItems.push(sanitized)
      }
    }

    return validItems
  } catch (err) {
    console.warn('[cartStorage] Failed to parse stored cart data:', err)
    return []
  }
}

/**
 * Saves current cart items to localStorage.
 * Handles storage quota or private-browsing security errors safely.
 */
export function saveCartToStorage(items: CartItem[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    if (!Array.isArray(items) || items.length === 0) {
      window.localStorage.removeItem(CART_STORAGE_KEY)
      return
    }

    // Persist only clean, sanitized items
    const cleanItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      image: item.image,
      unitPrice: item.unitPrice,
      quantity: sanitizeQuantity(item.quantity),
      isAvailable: item.isAvailable ?? true,
    }))

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cleanItems))
  } catch (err) {
    console.warn('[cartStorage] Failed to save cart to localStorage:', err)
  }
}

/**
 * Reconciles cart items against the authoritative product catalog.
 * Updates names, images, prices, and marks items as unavailable if not found or if isAvailable=false.
 */
export function reconcileCartWithProducts(
  cart: CartItem[],
  products: Product[]
): { updatedCart: CartItem[]; hasUnavailable: boolean } {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { updatedCart: [], hasUnavailable: false }
  }

  if (!Array.isArray(products) || products.length === 0) {
    // If products haven't loaded yet, return current cart without false-flagging
    return { updatedCart: cart, hasUnavailable: false }
  }

  const productMap = new Map<string, Product>()
  for (const p of products) {
    productMap.set(p._id, p)
  }

  let hasUnavailable = false

  const updatedCart = cart.map((item) => {
    const matched = productMap.get(item.id)
    if (!matched) {
      // Product no longer exists in catalog
      hasUnavailable = true
      return {
        ...item,
        isAvailable: false,
      }
    }

    const isAvailable = matched.isAvailable
    if (!isAvailable) {
      hasUnavailable = true
    }

    return {
      ...item,
      name: matched.name,
      image: matched.image,
      unitPrice: matched.price,
      isAvailable,
    }
  })

  return { updatedCart, hasUnavailable }
}
