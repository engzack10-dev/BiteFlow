import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser, useAuth } from '@clerk/react'
import { api } from './api/client.js'
import type {
  UserProfile,
  AdminStats,
  Category,
  Product,
  UserRole,
  OrderStatus,
  OrderRecord,
  AdminOrdersResponse,
  PaymentRecord,
  RestaurantSettingsData,
} from './types/index.js'

// Hooks
import { useToast } from './hooks/useToast.js'
import { useCart } from './hooks/useCart.js'
import { useMenu } from './hooks/useMenu.js'

// Layout & Common Components
import { Header, type NavTab } from './components/layout/Header.js'
import { Footer } from './components/layout/Footer.js'
import { Toast } from './components/common/Toast.js'
import { DeleteConfirmModal } from './components/common/DeleteConfirmModal.js'
import { MyOrdersModal } from './components/common/MyOrdersModal.js'

// Modals & Drawers
import { CartDrawer } from './components/cart/CartDrawer.js'
import { CheckoutModal } from './components/cart/CheckoutModal.js'
import { CategoryModal } from './components/admin/CategoryModal.js'
import { ProductModal } from './components/admin/ProductModal.js'
import { VerifyPaymentModal } from './components/admin/VerifyPaymentModal.js'
import { RejectPaymentModal } from './components/admin/RejectPaymentModal.js'
import { PaymentAuditModal } from './components/admin/PaymentAuditModal.js'
import { AdminOrderDetailsModal } from './components/admin/AdminOrderDetailsModal.js'

// Pages
import { StorefrontPage } from './pages/StorefrontPage.js'
import { CartPage } from './pages/CartPage.js'
import { AdminPage } from './pages/AdminPage.js'
import { CustomerOrdersPage } from './components/orders/CustomerOrdersPage.js'
import { ContactPage } from './pages/ContactPage.js'
import type { AdminSubTab } from './components/admin/AdminTabNav.js'

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.toLowerCase().startsWith('/admin')) {
      return 'admin'
    }
    return 'home'
  })
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)

  // Synchronize browser URL with activeTab (dedicated /admin route)
  const handleTabChange = useCallback((tab: NavTab) => {
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      if (tab === 'admin') {
        if (window.location.pathname !== '/admin') {
          window.history.pushState(null, '', '/admin')
        }
      } else {
        if (window.location.pathname === '/admin') {
          window.history.pushState(null, '', '/')
        }
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }, [])

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const onPopState = () => {
      const isAdmin = window.location.pathname.toLowerCase().startsWith('/admin')
      if (isAdmin) {
        setActiveTab('admin')
      } else {
        setActiveTab((prev) => (prev === 'admin' ? 'home' : prev))
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Custom Toast Hook
  const { toastMessage, showToast } = useToast()

  // Custom Cart Hook
  const {
    cartItems,
    subtotal,
    grandTotal,
    totalUnitCount,
    hasUnavailableItems,
    updateQuantity,
    removeItem,
    addProductToCart,
    reconcileWithProducts,
    clearCart,
  } = useCart(showToast)

  // Custom Menu Hook
  const { categories, products, isLoadingMenu, menuError, refreshMenu } = useMenu()

  // Clerk Auth
  const { user, isLoaded: isUserLoaded } = useUser()
  const { getToken, isSignedIn } = useAuth()

  // Backend User & Admin State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([])
  const [adminError, setAdminError] = useState<string | null>(null)
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false)
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('dashboard')
  const hasRedirectedAdminRef = useRef(false)

  // Admin: Payments Queue State (FS-06)
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)
  const [selectedVerifyPayment, setSelectedVerifyPayment] = useState<PaymentRecord | null>(null)
  const [selectedRejectPayment, setSelectedRejectPayment] = useState<PaymentRecord | null>(null)
  const [selectedAuditPayment, setSelectedAuditPayment] = useState<PaymentRecord | null>(null)
  const [isSubmittingPaymentAction, setIsSubmittingPaymentAction] = useState(false)

  // Admin: Order Management State (FS-07)
  const [adminOrders, setAdminOrders] = useState<OrderRecord[]>([])
  const [adminOrderCounts, setAdminOrderCounts] = useState<AdminOrdersResponse['counts'] | undefined>(undefined)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [selectedInspectOrder, setSelectedInspectOrder] = useState<OrderRecord | null>(null)

  // Customer: My Orders & Order Tracking State (FS-08)
  const [showMyOrdersModal, setShowMyOrdersModal] = useState(false)
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null)

  // Restaurant Settings (FS-12)
  const [restaurantSettings, setRestaurantSettings] = useState<RestaurantSettingsData | null>(null)

  // Admin: Category Form State
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDesc, setCategoryDesc] = useState('')
  const [categoryActive, setCategoryActive] = useState(true)

  // Admin: Product Form State
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productName, setProductName] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [productPrice, setProductPrice] = useState('299.99')
  const [productImage, setProductImage] = useState('/delicious-burger.jpg')
  const [productCategoryId, setProductCategoryId] = useState('')
  const [productAvailable, setProductAvailable] = useState(true)

  // Delete Confirm Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'category' | 'product'
    id: string
    name: string
  } | null>(null)

  // 0. Load public restaurant settings on startup (FS-12)
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await api.getPublicSettings()
        setRestaurantSettings(res.settings)
      } catch (err) {
        console.error('Failed to load restaurant settings:', err)
      }
    }
    loadSettings()
  }, [])

  // 1. Reconcile persisted cart items with authoritative products when loaded
  useEffect(() => {
    if (products.length > 0) {
      reconcileWithProducts(products)
    }
  }, [products, reconcileWithProducts])

  // 2. Synchronize user with backend upon sign-in & direct admin to dashboard
  useEffect(() => {
    async function syncBackendUser() {
      if (!isUserLoaded) return

      if (isSignedIn && user) {
        try {
          const res = await api.syncUser(getToken)
          setUserProfile(res.user)

          // Direct admin users to the dedicated admin dashboard upon login
          if (res.user?.role === 'admin' && !hasRedirectedAdminRef.current) {
            hasRedirectedAdminRef.current = true
            handleTabChange('admin')
          }
        } catch (err) {
          console.error('Failed to sync user with backend:', err)
        }
      } else {
        setUserProfile(null)
        hasRedirectedAdminRef.current = false
      }
    }

    syncBackendUser()
  }, [isSignedIn, isUserLoaded, user, getToken, handleTabChange])

  // Payments loader
  const loadPayments = async () => {
    setIsLoadingPayments(true)
    try {
      const res = await api.getPayments(getToken)
      setPayments(res.payments || [])
    } catch (err) {
      console.error('Failed to load payments queue:', err)
    } finally {
      setIsLoadingPayments(false)
    }
  }

  // Admin Orders loader (FS-07)
  const loadAdminOrders = async (filters?: {
    status?: string
    startDate?: string
    endDate?: string
    search?: string
  }) => {
    setIsLoadingOrders(true)
    try {
      const res = await api.getAdminOrders(getToken, filters)
      setAdminOrders(res.orders || [])
      setAdminOrderCounts(res.counts)
    } catch (err) {
      console.error('Failed to load admin orders queue:', err)
    } finally {
      setIsLoadingOrders(false)
    }
  }

  // 3. Fetch admin overview & data when switching to admin tab
  const handleRetryAdmin = useCallback(async () => {
    setIsLoadingAdmin(true)
    setAdminError(null)

    try {
      const [overviewRes, usersRes, paymentsRes, ordersRes] = await Promise.all([
        api.getAdminOverview(getToken),
        api.getAdminUsers(getToken),
        api.getPayments(getToken),
        api.getAdminOrders(getToken),
      ])
      setAdminStats(overviewRes.stats)
      setAdminUsers(usersRes.users)
      setPayments(paymentsRes.payments || [])
      setAdminOrders(ordersRes.orders || [])
      setAdminOrderCounts(ordersRes.counts)
      await refreshMenu()
    } catch (err) {
      const e = err as Error & { status?: number; data?: { error?: string } }
      setAdminError(
        e.data?.error || e.message || 'Server rejected access (403 Forbidden)'
      )
    } finally {
      setIsLoadingAdmin(false)
    }
  }, [getToken, refreshMenu])

  useEffect(() => {
    if (activeTab !== 'admin') return
    let active = true

    void Promise.resolve().then(async () => {
      if (!active) return
      setIsLoadingAdmin(true)
      setAdminError(null)

      try {
        const [overviewRes, usersRes, paymentsRes, ordersRes] = await Promise.all([
          api.getAdminOverview(getToken),
          api.getAdminUsers(getToken),
          api.getPayments(getToken),
          api.getAdminOrders(getToken),
        ])
        if (!active) return
        setAdminStats(overviewRes.stats)
        setAdminUsers(usersRes.users)
        setPayments(paymentsRes.payments || [])
        setAdminOrders(ordersRes.orders || [])
        setAdminOrderCounts(ordersRes.counts)
        await refreshMenu()
      } catch (err) {
        if (!active) return
        const e = err as Error & { status?: number; data?: { error?: string } }
        setAdminError(
          e.data?.error || e.message || 'Server rejected access (403 Forbidden)'
        )
      } finally {
        if (active) {
          setIsLoadingAdmin(false)
        }
      }
    })

    return () => {
      active = false
    }
  }, [activeTab, getToken, refreshMenu])

  // Update Order Status Handler (FS-07)
  const handleUpdateOrderStatus = async (
    orderId: string,
    nextStatus: OrderStatus,
    note?: string
  ) => {
    try {
      const res = await api.updateOrderStatus(getToken, orderId, nextStatus, note)
      showToast(res.message || `Order status updated to ${nextStatus}`)
      if (
        selectedInspectOrder &&
        (selectedInspectOrder.id === orderId ||
          selectedInspectOrder._id === orderId ||
          selectedInspectOrder.orderNumber === orderId)
      ) {
        setSelectedInspectOrder(res.order)
      }
      await Promise.all([
        loadAdminOrders(),
        api.getAdminOverview(getToken).then((r) => setAdminStats(r.stats)).catch(() => {}),
      ])
    } catch (err) {
      const e = err as Error
      showToast(`Status update failed: ${e.message}`)
      throw err
    }
  }

  // Verify Payment Handler
  const handleConfirmVerifyPayment = async (paymentId: string) => {
    setIsSubmittingPaymentAction(true)
    try {
      const res = await api.verifyPayment(getToken, paymentId)
      showToast(res.message || 'Payment verified! Order confirmed.')
      setSelectedVerifyPayment(null)
      await Promise.all([
        loadPayments(),
        api.getAdminOverview(getToken).then((r) => setAdminStats(r.stats)).catch(() => {}),
      ])
    } catch (err) {
      const e = err as Error
      showToast(`Verification failed: ${e.message}`)
    } finally {
      setIsSubmittingPaymentAction(false)
    }
  }

  // Reject Payment Handler
  const handleConfirmRejectPayment = async (paymentId: string, reason: string) => {
    setIsSubmittingPaymentAction(true)
    try {
      const res = await api.rejectPayment(getToken, paymentId, reason)
      showToast(res.message || 'Payment rejected.')
      setSelectedRejectPayment(null)
      await Promise.all([
        loadPayments(),
        api.getAdminOverview(getToken).then((r) => setAdminStats(r.stats)).catch(() => {}),
      ])
    } catch (err) {
      const e = err as Error
      showToast(`Rejection failed: ${e.message}`)
    } finally {
      setIsSubmittingPaymentAction(false)
    }
  }

  const handleUpdateCart = () => {
    showToast('Cart updated successfully!')
  }

  // Order Success Handler (Cart is cleared ONLY after server returns 201 Created)
  const handleOrderSuccess = (order: OrderRecord) => {
    clearCart()
    showToast(`Order ${order.orderNumber} placed successfully!`)
  }

  // Role toggle in Admin
  const handleRoleChange = async (targetClerkId: string, newRole: UserRole) => {
    try {
      await api.updateUserRole(getToken, targetClerkId, newRole)
      showToast(`User role updated to ${newRole}`)
      const usersRes = await api.getAdminUsers(getToken)
      setAdminUsers(usersRes.users)
      if (targetClerkId === userProfile?.clerkId) {
        const profileRes = await api.getCurrentUser(getToken)
        setUserProfile(profileRes.user)
      }
    } catch (err) {
      const e = err as Error
      showToast(`Failed: ${e.message}`)
    }
  }

  // ================= CATEGORY CRUD HANDLERS =================
  const openCreateCategory = () => {
    setEditingCategory(null)
    setCategoryName('')
    setCategoryDesc('')
    setCategoryActive(true)
    setShowCategoryModal(true)
  }

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat)
    setCategoryName(cat.name)
    setCategoryDesc(cat.description || '')
    setCategoryActive(cat.isActive)
    setShowCategoryModal(true)
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryName.trim()) {
      showToast('Category name is required')
      return
    }

    try {
      if (editingCategory) {
        await api.updateCategory(getToken, editingCategory._id, {
          name: categoryName.trim(),
          description: categoryDesc.trim(),
          isActive: categoryActive,
        })
        showToast(`Category "${categoryName}" updated!`)
      } else {
        await api.createCategory(getToken, {
          name: categoryName.trim(),
          description: categoryDesc.trim(),
          isActive: categoryActive,
        })
        showToast(`Category "${categoryName}" created!`)
      }
      setShowCategoryModal(false)
      await refreshMenu()
    } catch (err) {
      const e = err as Error
      showToast(`Error: ${e.message}`)
    }
  }

  const confirmDeleteCategory = (cat: Category) => {
    setDeleteConfirm({
      type: 'category',
      id: cat._id,
      name: cat.name,
    })
  }

  // ================= PRODUCT CRUD HANDLERS =================
  const openCreateProduct = () => {
    setEditingProduct(null)
    setProductName('')
    setProductDesc('')
    setProductPrice('299.99')
    setProductImage('/delicious-burger.jpg')
    setProductCategoryId(categories[0]?._id || '')
    setProductAvailable(true)
    setShowProductModal(true)
  }

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod)
    setProductName(prod.name)
    setProductDesc(prod.description)
    setProductPrice(prod.price.toString())
    setProductImage(prod.image)
    const catId = typeof prod.category === 'object' && prod.category ? prod.category._id : (prod.category as string)
    setProductCategoryId(catId)
    setProductAvailable(prod.isAvailable)
    setShowProductModal(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productName.trim() || !productDesc.trim() || !productCategoryId) {
      showToast('Please fill out all required fields')
      return
    }

    const priceNum = parseFloat(productPrice)
    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Price must be a valid number (>= 0)')
      return
    }

    try {
      if (editingProduct) {
        await api.updateProduct(getToken, editingProduct._id, {
          name: productName.trim(),
          description: productDesc.trim(),
          price: priceNum,
          image: productImage.trim(),
          category: productCategoryId,
          isAvailable: productAvailable,
        })
        showToast(`Product "${productName}" updated!`)
      } else {
        await api.createProduct(getToken, {
          name: productName.trim(),
          description: productDesc.trim(),
          price: priceNum,
          image: productImage.trim(),
          category: productCategoryId,
          isAvailable: productAvailable,
        })
        showToast(`Product "${productName}" created!`)
      }
      setShowProductModal(false)
      await refreshMenu()
    } catch (err) {
      const e = err as Error
      showToast(`Error: ${e.message}`)
    }
  }

  const handleToggleProductAvailability = async (prod: Product) => {
    try {
      const updated = await api.toggleProductAvailability(
        getToken,
        prod._id,
        !prod.isAvailable
      )
      showToast(updated.message)
      await refreshMenu()
    } catch (err) {
      const e = err as Error
      showToast(`Error: ${e.message}`)
    }
  }

  const confirmDeleteProduct = (prod: Product) => {
    setDeleteConfirm({
      type: 'product',
      id: prod._id,
      name: prod.name,
    })
  }

  // Execute confirmed deletion
  const executeDelete = async () => {
    if (!deleteConfirm) return

    try {
      if (deleteConfirm.type === 'category') {
        const res = await api.deleteCategory(getToken, deleteConfirm.id)
        showToast(res.message || 'Category deleted')
      } else {
        const res = await api.deleteProduct(getToken, deleteConfirm.id)
        showToast(res.message || 'Product deleted')
      }
      setDeleteConfirm(null)
      await refreshMenu()
    } catch (err) {
      const e = err as Error
      showToast(`Delete failed: ${e.message}`)
      setDeleteConfirm(null)
    }
  }

  if (activeTab === 'admin') {
    return (
      <div className="admin-app-root">
        <AdminPage
          isLoadingAdmin={isLoadingAdmin}
          adminError={adminError}
          userRole={userProfile?.role}
          adminStats={adminStats}
          categories={categories}
          products={products}
          adminUsers={adminUsers}
          adminSubTab={adminSubTab}
          onSelectSubTab={setAdminSubTab}
          onReturnToStorefront={() => handleTabChange('home')}
          onAddProduct={openCreateProduct}
          onToggleProductAvailability={handleToggleProductAvailability}
          onEditProduct={openEditProduct}
          onDeleteProduct={confirmDeleteProduct}
          onAddCategory={openCreateCategory}
          onEditCategory={openEditCategory}
          onDeleteCategory={confirmDeleteCategory}
          onRoleChange={handleRoleChange}
          payments={payments}
          isLoadingPayments={isLoadingPayments}
          onVerifyPayment={(p) => setSelectedVerifyPayment(p)}
          onRejectPayment={(p) => setSelectedRejectPayment(p)}
          onViewAudit={(p) => setSelectedAuditPayment(p)}
          onRefreshPayments={loadPayments}
          orders={adminOrders}
          orderCounts={adminOrderCounts}
          isLoadingOrders={isLoadingOrders}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onInspectOrder={(o) => setSelectedInspectOrder(o)}
          onRefreshOrders={loadAdminOrders}
          onRetryAdmin={handleRetryAdmin}
          getToken={getToken}
          showToast={showToast}
          onSettingsUpdated={(newSettings) => setRestaurantSettings(newSettings)}
        />

        {/* Toast Notification */}
        <Toast message={toastMessage} />

        {/* Admin: Category Form Modal */}
        <CategoryModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          editingCategory={editingCategory}
          categoryName={categoryName}
          setCategoryName={setCategoryName}
          categoryDesc={categoryDesc}
          setCategoryDesc={setCategoryDesc}
          categoryActive={categoryActive}
          setCategoryActive={setCategoryActive}
          onSubmit={handleSaveCategory}
        />

        {/* Admin: Product Form Modal */}
        <ProductModal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          editingProduct={editingProduct}
          categories={categories}
          productName={productName}
          setProductName={setProductName}
          productDesc={productDesc}
          setProductDesc={setProductDesc}
          productPrice={productPrice}
          setProductPrice={setProductPrice}
          productImage={productImage}
          setProductImage={setProductImage}
          productCategoryId={productCategoryId}
          setProductCategoryId={setProductCategoryId}
          productAvailable={productAvailable}
          setProductAvailable={setProductAvailable}
          onSubmit={handleSaveProduct}
        />

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <DeleteConfirmModal
            type={deleteConfirm.type}
            name={deleteConfirm.name}
            onCancel={() => setDeleteConfirm(null)}
            onConfirm={executeDelete}
          />
        )}

        {/* Admin: Verify Payment Modal (FS-06) */}
        <VerifyPaymentModal
          isOpen={!!selectedVerifyPayment}
          onClose={() => setSelectedVerifyPayment(null)}
          payment={selectedVerifyPayment}
          onConfirmVerify={handleConfirmVerifyPayment}
          isSubmitting={isSubmittingPaymentAction}
        />

        {/* Admin: Reject Payment Modal (FS-06) */}
        <RejectPaymentModal
          isOpen={!!selectedRejectPayment}
          onClose={() => setSelectedRejectPayment(null)}
          payment={selectedRejectPayment}
          onConfirmReject={handleConfirmRejectPayment}
          isSubmitting={isSubmittingPaymentAction}
        />

        {/* Admin: Payment Audit History Modal (FS-06) */}
        <PaymentAuditModal
          isOpen={!!selectedAuditPayment}
          onClose={() => setSelectedAuditPayment(null)}
          payment={selectedAuditPayment}
        />

        {/* Admin: Order Details & Lifecycle Modal (FS-07) */}
        <AdminOrderDetailsModal
          isOpen={!!selectedInspectOrder}
          onClose={() => setSelectedInspectOrder(null)}
          order={selectedInspectOrder}
          onUpdateStatus={handleUpdateOrderStatus}
        />
      </div>
    )
  }

  return (
    <div className="app-layout">
      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'orders') setTrackingOrderId(null)
          handleTabChange(tab)
        }}
        onOpenCart={() => setIsCartDrawerOpen(true)}
        userProfile={userProfile}
        totalItemCount={totalUnitCount}
        restaurantSettings={restaurantSettings}
      />

      {/* Main Content Router */}
      <main className="main-content-wrapper">
        {activeTab === 'home' ? (
          <StorefrontPage
            categories={categories}
            products={products}
            isLoadingMenu={isLoadingMenu}
            menuError={menuError}
            refreshMenu={refreshMenu}
            onAddToCart={addProductToCart}
            onNavigateToMenu={() => handleTabChange('menu')}
            showHero={true}
          />
        ) : activeTab === 'menu' ? (
          <StorefrontPage
            categories={categories}
            products={products}
            isLoadingMenu={isLoadingMenu}
            menuError={menuError}
            refreshMenu={refreshMenu}
            onAddToCart={addProductToCart}
            onNavigateToMenu={() => handleTabChange('menu')}
            showHero={false}
          />
        ) : activeTab === 'cart' ? (
          <div className="cart-page-wrapper">
            <CartPage
              items={cartItems}
              grandTotal={grandTotal}
              hasUnavailableItems={hasUnavailableItems}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onBrowseMenu={() => handleTabChange('menu')}
              onUpdateCart={handleUpdateCart}
              onCheckout={() => {
                setShowCheckoutModal(true)
              }}
            />
          </div>
        ) : activeTab === 'orders' ? (
          <div className="orders-page-wrapper">
            <CustomerOrdersPage
              getToken={getToken}
              isSignedIn={!!isSignedIn}
              onNavigateToMenu={() => handleTabChange('menu')}
              initialSelectedOrderId={trackingOrderId}
            />
          </div>
        ) : activeTab === 'about' ? (
          <div className="storefront-page">
            <div style={{ maxWidth: '960px', margin: '3rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
              <h2 className="menu-script-heading" style={{ marginBottom: '1rem' }}>About BiteFlow</h2>
              <p style={{ color: '#4b5563', fontSize: '1.1rem', lineHeight: 1.8, marginBottom: '2rem' }}>
                We believe exceptional food brings people together. Our kitchen crafts every burger patty by hand,
                ferments our pizza dough for 48 hours, and sources only fresh, high-quality ingredients.
                Fast service meets restaurant-grade taste right at your doorstep.
              </p>
            </div>
            <StorefrontPage
              categories={categories}
              products={products}
              isLoadingMenu={isLoadingMenu}
              menuError={menuError}
              refreshMenu={refreshMenu}
              onAddToCart={addProductToCart}
              onNavigateToMenu={() => handleTabChange('menu')}
              showHero={false}
            />
          </div>
        ) : activeTab === 'contact' ? (
          <ContactPage
            key={user?.id || 'guest'}
            isSignedIn={!!isSignedIn}
            userEmail={user?.primaryEmailAddress?.emailAddress}
            userName={user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
            showToast={showToast}
            onNavigateToMenu={() => handleTabChange('menu')}
            restaurantSettings={restaurantSettings}
          />
        ) : (
          <StorefrontPage
            categories={categories}
            products={products}
            isLoadingMenu={isLoadingMenu}
            menuError={menuError}
            refreshMenu={refreshMenu}
            onAddToCart={addProductToCart}
            onNavigateToMenu={() => handleTabChange('menu')}
            showHero={true}
          />
        )}
      </main>

      {/* Site Footer */}
      <Footer settings={restaurantSettings} />

      {/* Toast Notification */}
      <Toast message={toastMessage} />

      {/* Persistent Cart Drawer */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        items={cartItems}
        subtotal={subtotal}
        grandTotal={grandTotal}
        totalUnitCount={totalUnitCount}
        hasUnavailableItems={hasUnavailableItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onCheckout={() => {
          setIsCartDrawerOpen(false)
          setShowCheckoutModal(true)
        }}
        onBrowseMenu={() => {
          setIsCartDrawerOpen(false)
          if (activeTab !== 'menu' && activeTab !== 'home') {
            handleTabChange('menu')
          }
          const menuEl = document.getElementById('menu-section')
          if (menuEl) {
            menuEl.scrollIntoView({ behavior: 'smooth' })
          }
        }}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        onReturnToCart={() => {
          setShowCheckoutModal(false)
          setIsCartDrawerOpen(true)
        }}
        cartItems={cartItems}
        grandTotal={grandTotal}
        isSignedIn={!!isSignedIn}
        userEmail={user?.primaryEmailAddress?.emailAddress}
        userName={user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
        getToken={getToken}
        onOrderSuccess={handleOrderSuccess}
        onTrackOrder={(order) => {
          setTrackingOrderId(order.orderNumber)
          handleTabChange('orders')
        }}
        restaurantSettings={restaurantSettings}
      />

      {/* Admin: Category Form Modal */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        editingCategory={editingCategory}
        categoryName={categoryName}
        setCategoryName={setCategoryName}
        categoryDesc={categoryDesc}
        setCategoryDesc={setCategoryDesc}
        categoryActive={categoryActive}
        setCategoryActive={setCategoryActive}
        onSubmit={handleSaveCategory}
      />

      {/* Admin: Product Form Modal */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        editingProduct={editingProduct}
        categories={categories}
        productName={productName}
        setProductName={setProductName}
        productDesc={productDesc}
        setProductDesc={setProductDesc}
        productPrice={productPrice}
        setProductPrice={setProductPrice}
        productImage={productImage}
        setProductImage={setProductImage}
        productCategoryId={productCategoryId}
        setProductCategoryId={setProductCategoryId}
        productAvailable={productAvailable}
        setProductAvailable={setProductAvailable}
        onSubmit={handleSaveProduct}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          type={deleteConfirm.type}
          name={deleteConfirm.name}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={executeDelete}
        />
      )}

      {/* Admin: Verify Payment Modal (FS-06) */}
      <VerifyPaymentModal
        isOpen={!!selectedVerifyPayment}
        onClose={() => setSelectedVerifyPayment(null)}
        payment={selectedVerifyPayment}
        onConfirmVerify={handleConfirmVerifyPayment}
        isSubmitting={isSubmittingPaymentAction}
      />

      {/* Admin: Reject Payment Modal (FS-06) */}
      <RejectPaymentModal
        isOpen={!!selectedRejectPayment}
        onClose={() => setSelectedRejectPayment(null)}
        payment={selectedRejectPayment}
        onConfirmReject={handleConfirmRejectPayment}
        isSubmitting={isSubmittingPaymentAction}
      />

      {/* Admin: Payment Audit History Modal (FS-06) */}
      <PaymentAuditModal
        isOpen={!!selectedAuditPayment}
        onClose={() => setSelectedAuditPayment(null)}
        payment={selectedAuditPayment}
      />

      {/* Customer: My Orders & Payment Status Modal (FS-06) */}
      <MyOrdersModal
        isOpen={showMyOrdersModal}
        onClose={() => setShowMyOrdersModal(false)}
        getToken={getToken}
      />

      {/* Admin: Order Details & Lifecycle Modal (FS-07) */}
      <AdminOrderDetailsModal
        isOpen={!!selectedInspectOrder}
        onClose={() => setSelectedInspectOrder(null)}
        order={selectedInspectOrder}
        onUpdateStatus={handleUpdateOrderStatus}
      />
    </div>
  )
}
