import { useState, useMemo, useCallback, useEffect } from 'react'
import type { CartItem, Product } from '../types/index.js'
import {
  calculateCartSubtotal,
  calculateOrderTotal,
  calculateTotalItemCount,
  calculateTotalUnitCount,
  sanitizeQuantity,
} from '../utils/cartCalculations.js'
import {
  loadCartFromStorage,
  saveCartToStorage,
  reconcileCartWithProducts,
} from '../utils/cartStorage.js'

export function useCart(onToast?: (msg: string) => void) {
  // Initialize state directly from validated localStorage data
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadCartFromStorage())

  // Persist cart changes whenever cartItems changes
  useEffect(() => {
    saveCartToStorage(cartItems)
  }, [cartItems])

  /**
   * Updates quantity by delta (+1, -1).
   * Decreasing quantity below 1 removes the item from the cart.
   */
  const updateQuantity = useCallback(
    (id: string, delta: number) => {
      setCartItems((prev) => {
        const target = prev.find((item) => item.id === id)
        if (!target) return prev

        const newQty = target.quantity + delta

        if (newQty <= 0) {
          onToast?.(`Removed "${target.name}" from cart`)
          return prev.filter((item) => item.id !== id)
        }

        const clampedQty = sanitizeQuantity(newQty, 1, 99)
        return prev.map((item) =>
          item.id === id ? { ...item, quantity: clampedQty } : item
        )
      })
    },
    [onToast]
  )

  /**
   * Sets the exact quantity for an item, sanitized to positive integers (1..99).
   */
  const setExactQuantity = useCallback((id: string, rawQuantity: number) => {
    const safeQty = sanitizeQuantity(rawQuantity, 1, 99)
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: safeQty } : item
      )
    )
  }, [])

  /**
   * Removes an individual product from the cart completely.
   */
  const removeItem = useCallback(
    (id: string) => {
      setCartItems((prev) => {
        const item = prev.find((p) => p.id === id)
        if (item) {
          onToast?.(`Removed "${item.name}" from cart`)
        }
        return prev.filter((p) => p.id !== id)
      })
    },
    [onToast]
  )

  /**
   * Adds an available product to the cart with specified quantity.
   * Increments existing quantity if product is already in the cart.
   * Prevents adding unavailable products.
   */
  const addProductToCart = useCallback(
    (prod: Product, quantity = 1) => {
      if (!prod.isAvailable) {
        onToast?.(`"${prod.name}" is currently unavailable and cannot be added`)
        return
      }

      const qtyToAdd = sanitizeQuantity(quantity, 1, 99)

      setCartItems((prev) => {
        const existing = prev.find((p) => p.id === prod._id)
        if (existing) {
          const updatedQty = sanitizeQuantity(existing.quantity + qtyToAdd, 1, 99)
          return prev.map((p) =>
            p.id === prod._id
              ? {
                  ...p,
                  name: prod.name,
                  image: prod.image,
                  unitPrice: prod.price,
                  quantity: updatedQty,
                  isAvailable: true,
                }
              : p
          )
        }

        return [
          ...prev,
          {
            id: prod._id,
            name: prod.name,
            image: prod.image,
            unitPrice: prod.price,
            quantity: qtyToAdd,
            isAvailable: true,
          },
        ]
      })

      onToast?.(
        qtyToAdd > 1
          ? `Added ${qtyToAdd}x "${prod.name}" to cart!`
          : `Added "${prod.name}" to cart!`
      )
    },
    [onToast]
  )

  /**
   * Reconciles cart items against authoritative backend product records.
   * Ensures prices, names, images, and availability are up-to-date.
   */
  const reconcileWithProducts = useCallback((products: Product[]) => {
    if (!products || products.length === 0) return

    setCartItems((currentCart) => {
      if (currentCart.length === 0) return currentCart
      const { updatedCart } = reconcileCartWithProducts(currentCart, products)
      return updatedCart
    })
  }, [])

  /**
   * Clears all items from the cart.
   */
  const clearCart = useCallback(() => {
    setCartItems([])
    onToast?.('Cart cleared')
  }, [onToast])

  /**
   * Optional helper to initialize sample items for new empty carts (if explicitly triggered)
   */
  const initializeDefaultCart = useCallback(() => {
    setCartItems((current) => {
      // If user already has items in storage, do NOT overwrite
      if (current.length > 0) return current
      return current
    })
  }, [])

  /**
   * Sample items restore helper for testing
   */
  const restoreSampleItems = useCallback(
    (products: Product[]) => {
      if (products.length >= 2) {
        const p1 = products[0]
        const p2 = products[1]
        setCartItems([
          { id: p1._id, name: p1.name, image: p1.image, unitPrice: p1.price, quantity: 2, isAvailable: p1.isAvailable },
          { id: p2._id, name: p2.name, image: p2.image, unitPrice: p2.price, quantity: 1, isAvailable: p2.isAvailable },
        ])
        onToast?.('Sample items restored')
      }
    },
    [onToast]
  )

  // Calculations
  const subtotal = useMemo(() => calculateCartSubtotal(cartItems), [cartItems])
  const grandTotal = useMemo(() => calculateOrderTotal(cartItems), [cartItems])
  const totalItemCount = useMemo(() => calculateTotalItemCount(cartItems), [cartItems])
  const totalUnitCount = useMemo(() => calculateTotalUnitCount(cartItems), [cartItems])

  // Flag if any item in cart is currently marked as unavailable
  const hasUnavailableItems = useMemo(
    () => cartItems.some((item) => item.isAvailable === false),
    [cartItems]
  )

  return {
    cartItems,
    setCartItems,
    subtotal,
    grandTotal,
    totalItemCount,
    totalUnitCount,
    hasUnavailableItems,
    updateQuantity,
    setExactQuantity,
    removeItem,
    addProductToCart,
    reconcileWithProducts,
    initializeDefaultCart,
    restoreSampleItems,
    clearCart,
  }
}
