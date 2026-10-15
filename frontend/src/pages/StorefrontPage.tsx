import type { Category, Product } from '../types/index.js'
import { HeroBanner } from '../components/home/HeroBanner.js'
import { StorefrontMenu } from '../components/menu/StorefrontMenu.js'

interface StorefrontPageProps {
  categories: Category[]
  products: Product[]
  isLoadingMenu: boolean
  menuError?: string | null
  refreshMenu?: () => void
  onAddToCart: (prod: Product, quantity?: number) => void
  onNavigateToMenu: () => void
  showHero?: boolean
}

export function StorefrontPage({
  categories,
  products,
  isLoadingMenu,
  menuError,
  refreshMenu,
  onAddToCart,
  onNavigateToMenu,
  showHero = true,
}: StorefrontPageProps) {
  const handleOrderNow = () => {
    onNavigateToMenu()
    const menuEl = document.getElementById('menu-section')
    if (menuEl) {
      menuEl.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="storefront-page">
      {showHero && (
        <HeroBanner
          onOrderNow={handleOrderNow}
          onBrowseCategories={handleOrderNow}
        />
      )}
      <StorefrontMenu
        categories={categories}
        products={products}
        isLoadingMenu={isLoadingMenu}
        menuError={menuError}
        refreshMenu={refreshMenu}
        onAddToCart={onAddToCart}
      />
    </div>
  )
}
