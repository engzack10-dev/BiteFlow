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
    <section className="delicious-menu-section" id="menu-section">
      {/* Modern Centered "What's Cooking - Our Delicious Menu" Header */}
      <div className="delicious-menu-header">
        <span className="delicious-menu-script-sub">What&apos;s Cooking</span>
        <h2 className="delicious-menu-main-title">
          Our Delicious <span className="delicious-title-accent">Menu</span>
        </h2>
        <div className="delicious-title-underline" />
      </div>

      {/* Category Filter Pills: All, Burgers, Pizza, Chicken, ... */}
      <div className="delicious-category-tabs" role="tablist" aria-label="Menu Categories">
        <button
          role="tab"
          aria-selected={selectedCategory === 'all'}
          className={`delicious-category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
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
                className={`delicious-category-pill ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedCategory(c.name.toLowerCase())}
              >
                {c.name}
              </button>
            )
          })
        ) : (
          /* Fallback static buttons while categories load */
          <>
            <button
              role="tab"
              aria-selected={selectedCategory === 'burger'}
              className={`delicious-category-pill ${selectedCategory === 'burger' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('burger')}
            >
              Burgers
            </button>
            <button
              role="tab"
              aria-selected={selectedCategory === 'pizza'}
              className={`delicious-category-pill ${selectedCategory === 'pizza' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('pizza')}
            >
              Pizza
            </button>
            <button
              role="tab"
              aria-selected={selectedCategory === 'chicken'}
              className={`delicious-category-pill ${selectedCategory === 'chicken' ? 'active' : ''}`}
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
        <div className="delicious-products-grid">
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
