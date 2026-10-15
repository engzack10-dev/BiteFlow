import { useState } from 'react'
import type { Category, Product } from '../../types/index.js'
import { ProductCard } from './ProductCard.js'
import { ProductDetailsModal } from './ProductDetailsModal.js'

interface StorefrontMenuProps {
  categories: Category[]
  products: Product[]
  isLoadingMenu: boolean
  menuError?: string | null
  refreshMenu?: () => void
  onAddToCart: (prod: Product, quantity?: number) => void
}

export function StorefrontMenu({
  categories,
  products,
  isLoadingMenu,
  menuError,
  refreshMenu,
  onAddToCart,
}: StorefrontMenuProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [inspectedProduct, setInspectedProduct] = useState<Product | null>(null)

  // Explicit priority order: Pizza, Burger, Chicken, followed by remaining categories
  const priority = ['pizza', 'burger', 'chicken']

  const orderedCategories = [...categories].sort((a, b) => {
    const aIndex = priority.indexOf(a.name.toLowerCase())
    const bIndex = priority.indexOf(b.name.toLowerCase())

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return a.name.localeCompare(b.name)
  })

  const displayedProducts = products.filter((prod) => {
    if (selectedCategory === 'all') return true

    const catId =
      typeof prod.category === 'object' && prod.category
        ? prod.category._id
        : (prod.category as string)

    const catName =
      typeof prod.category === 'object' && prod.category
        ? prod.category.name.toLowerCase()
        : ''

    const prodName = prod.name.toLowerCase()

    if (selectedCategory === 'pizza') {
      return catName.includes('pizza') || prodName.includes('pizza')
    }
    if (selectedCategory === 'burger') {
      return catName.includes('burger') || prodName.includes('burger')
    }
    if (selectedCategory === 'chicken') {
      return catName.includes('chicken') || prodName.includes('chicken')
    }
    if (selectedCategory === 'pasta') {
      return catName.includes('pasta') || prodName.includes('pasta')
    }

    return (
      catId === selectedCategory ||
      catName === selectedCategory ||
      (catName && catName.includes(selectedCategory)) ||
      prodName.includes(selectedCategory)
    )
  })

  return (
    <section className="storefront-menu-section" id="menu-section">
      {/* Chef Artwork & "Our Menu" Script Heading */}
      <div className="menu-header-banner">
        <div className="chef-illustration-box">
          <img
            src="/chef-pizza.jpg"
            alt="Chef serving fresh pizza"
            className="chef-artwork-img"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = '/delicious-burger.jpg'
            }}
          />
        </div>
        <h2 className="menu-script-heading">Our Menu</h2>
      </div>

      {/* Category Filter Tabs: All, Pizza, Burger, Chicken, ... */}
      <div className="storefront-category-tabs" role="tablist" aria-label="Menu Categories">
        <button
          role="tab"
          aria-selected={selectedCategory === 'all'}
          className={`category-tab-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          All
        </button>

        {orderedCategories.length > 0 ? (
          orderedCategories.map((c) => {
            const isSelected =
              selectedCategory === c._id ||
              selectedCategory === c.name.toLowerCase()
            return (
              <button
                key={c._id}
                role="tab"
                aria-selected={isSelected}
                className={`category-tab-btn ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c.name.toLowerCase())}
              >
                {c.name}
              </button>
            )
          })
        ) : (
          /* Fallback static buttons if categories are loading */
          <>
            <button
              role="tab"
              aria-selected={selectedCategory === 'pizza'}
              className={`category-tab-btn ${selectedCategory === 'pizza' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('pizza')}
            >
              Pizza
            </button>
            <button
              role="tab"
              aria-selected={selectedCategory === 'burger'}
              className={`category-tab-btn ${selectedCategory === 'burger' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('burger')}
            >
              Burger
            </button>
            <button
              role="tab"
              aria-selected={selectedCategory === 'chicken'}
              className={`category-tab-btn ${selectedCategory === 'chicken' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('chicken')}
            >
              Chicken
            </button>
          </>
        )}
      </div>

      {/* UI State Handling: Loading, Error, Empty, or Product Grid */}
      {isLoadingMenu ? (
        <div className="menu-loading-box" role="status" aria-live="polite">
          <div className="spinner" />
          <p>Cooking up fresh menu items...</p>
        </div>
      ) : menuError && products.length === 0 ? (
        <div className="menu-error-box" role="alert">
          <div className="error-icon" aria-hidden="true">⚠️</div>
          <h3 className="error-title">Unable to Load Menu</h3>
          <p className="error-desc">{menuError}</p>
          {refreshMenu && (
            <button
              type="button"
              className="btn-retry"
              onClick={refreshMenu}
            >
              ↻ Try Again
            </button>
          )}
        </div>
      ) : displayedProducts.length === 0 ? (
        <div className="menu-empty-box">
          <p>No delicious items available in this category right now.</p>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              className="btn-reset-category"
              onClick={() => setSelectedCategory('all')}
            >
              View All Menu Items
            </button>
          )}
        </div>
      ) : (
        <div className="storefront-products-grid">
          {displayedProducts.map((prod) => (
            <ProductCard
              key={prod._id}
              product={prod}
              onAddToCart={onAddToCart}
              onInspect={(p) => setInspectedProduct(p)}
            />
          ))}
        </div>
      )}

      {/* Product Details Inspection Modal */}
      <ProductDetailsModal
        key={inspectedProduct?._id ?? 'none'}
        product={inspectedProduct}
        isOpen={!!inspectedProduct}
        onClose={() => setInspectedProduct(null)}
        onAddToCart={onAddToCart}
      />
    </section>
  )
}
