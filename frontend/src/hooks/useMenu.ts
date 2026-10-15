import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import type { Category, Product } from '../types/index.js'

export function useMenu() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)
  const [menuError, setMenuError] = useState<string | null>(null)

  const refreshMenu = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        api.getCategories(),
        api.getProducts(),
      ])
      setCategories(catRes.categories)
      setProducts(prodRes.products)
      setMenuError(null)
    } catch (err) {
      const e = err as Error
      setMenuError(e.message)
      console.error('[useMenu] Failed to refresh menu data:', err)
    }
  }, [])

  useEffect(() => {
    async function loadInitial() {
      setIsLoadingMenu(true)
      try {
        const [catRes, prodRes] = await Promise.all([
          api.getCategories(),
          api.getProducts(),
        ])
        setCategories(catRes.categories)
        setProducts(prodRes.products)
        setMenuError(null)
      } catch (err) {
        const e = err as Error
        setMenuError(e.message)
      } finally {
        setIsLoadingMenu(false)
      }
    }

    loadInitial()
  }, [])

  return {
    categories,
    products,
    isLoadingMenu,
    menuError,
    refreshMenu,
  }
}
