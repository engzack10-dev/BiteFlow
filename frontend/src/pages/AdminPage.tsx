import { useState, useEffect, useCallback } from 'react'
import type {
  AdminStats,
  Category,
  Product,
  UserProfile,
  UserRole,
  PaymentRecord,
  OrderRecord,
  OrderStatus,
  AdminOrdersResponse,
  CustomerRecord,
  FeedbackRecord,
  RestaurantSettingsData,
} from '../types/index.js'
import { api } from '../api/client.js'
import { UnauthorizedBanner } from '../components/admin/UnauthorizedBanner.js'
import { type AdminSubTab } from '../components/admin/AdminTabNav.js'
import { AdminDashboardView } from '../components/admin/AdminDashboardView.js'
import { AdminProductsTable } from '../components/admin/AdminProductsTable.js'
import { AdminCategoriesTable } from '../components/admin/AdminCategoriesTable.js'
import { AdminUsersTable } from '../components/admin/AdminUsersTable.js'
import { AdminPaymentsTable } from '../components/admin/AdminPaymentsTable.js'
import { AdminOrdersTable } from '../components/admin/AdminOrdersTable.js'
import { AdminDeliveryView } from '../components/admin/AdminDeliveryView.js'
import { AdminCustomersTable } from '../components/admin/AdminCustomersTable.js'
import { AdminReportsView } from '../components/admin/AdminReportsView.js'
import { AdminFeedbackTable } from '../components/admin/AdminFeedbackTable.js'
import { AdminSettingsView } from '../components/admin/AdminSettingsView.js'
import { ThemeToggle } from '../components/common/ThemeToggle.js'
import {
  DashboardIcon,
  OrdersIcon,
  DeliveryIcon,
  PaymentsIcon,
  ProductsIcon,
  CategoriesIcon,
  CustomersIcon,
  ReportsIcon,
  FeedbackIcon,
  SettingsIcon,
  UsersIcon,
  BellIcon,
} from '../components/common/AdminIcons.js'

interface AdminPageProps {
  isLoadingAdmin: boolean
  adminError: string | null
  userRole?: string
  adminStats: AdminStats | null
  categories: Category[]
  products: Product[]
  adminUsers: UserProfile[]
  adminSubTab: AdminSubTab
  onSelectSubTab: (tab: AdminSubTab) => void
  onReturnToStorefront: () => void
  onAddProduct: () => void
  onToggleProductAvailability: (prod: Product) => void
  onEditProduct: (prod: Product) => void
  onDeleteProduct: (prod: Product) => void
  onAddCategory: () => void
  onEditCategory: (cat: Category) => void
  onDeleteCategory: (cat: Category) => void
  onRoleChange: (clerkId: string, role: UserRole) => void
  payments: PaymentRecord[]
  isLoadingPayments: boolean
  onVerifyPayment: (payment: PaymentRecord) => void
  onRejectPayment: (payment: PaymentRecord) => void
  onViewAudit: (payment: PaymentRecord) => void
  onRefreshPayments: () => void
  orders: OrderRecord[]
  orderCounts?: AdminOrdersResponse['counts']
  isLoadingOrders: boolean
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus, note?: string) => Promise<void>
  onInspectOrder: (order: OrderRecord) => void
  onRefreshOrders: (filters?: { status?: string; startDate?: string; endDate?: string; search?: string }) => void
  onRetryAdmin?: () => void
  getToken: () => Promise<string | null>
  showToast: (msg: string) => void
  onSettingsUpdated?: (newSettings: RestaurantSettingsData) => void
}

export function AdminPage({
  isLoadingAdmin,
  adminError,
  userRole,
  adminStats,
  categories,
  products,
  adminUsers,
  adminSubTab,
  onSelectSubTab,
  onReturnToStorefront,
  onAddProduct,
  onToggleProductAvailability,
  onEditProduct,
  onDeleteProduct,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onRoleChange,
  payments,
  isLoadingPayments,
  onVerifyPayment,
  onRejectPayment,
  onViewAudit,
  onRefreshPayments,
  orders,
  orderCounts,
  isLoadingOrders,
  onUpdateOrderStatus,
  onInspectOrder,
  onRefreshOrders,
  onRetryAdmin,
  getToken,
  showToast,
  onSettingsUpdated,
}: AdminPageProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Customers State
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)

  // Feedback State
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([])
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false)

  // Load Customers
  const loadCustomers = useCallback(
    async (search?: string) => {
      setIsLoadingCustomers(true)
      try {
        const res = await api.getAdminCustomers(getToken, search)
        setCustomers(res.customers || [])
      } catch (err) {
        console.error('Failed to load customers:', err)
      } finally {
        setIsLoadingCustomers(false)
      }
    },
    [getToken]
  )

  // Load Customer Detail
  const handleLoadCustomerDetail = useCallback(
    async (id: string) => {
      return await api.getAdminCustomerDetail(getToken, id)
    },
    [getToken]
  )

  // Load Feedback
  const loadFeedback = useCallback(
    async (status?: string, search?: string) => {
      setIsLoadingFeedback(true)
      try {
        const res = await api.getAdminFeedback(getToken, status, search)
        setFeedback(res.feedback || [])
      } catch (err) {
        console.error('Failed to load feedback:', err)
      } finally {
        setIsLoadingFeedback(false)
      }
    },
    [getToken]
  )

  // Update Feedback Status
  const handleUpdateFeedbackStatus = useCallback(
    async (id: string, status: 'PENDING' | 'REVIEWED' | 'ARCHIVED') => {
      try {
        const res = await api.updateFeedbackStatus(getToken, id, status)
        showToast(res.message || 'Feedback status updated')
        setFeedback((prev) =>
          prev.map((f) => (f._id === id ? { ...f, status } : f))
        )
      } catch (err) {
        const e = err as Error
        showToast(`Failed: ${e.message}`)
        throw err
      }
    },
    [getToken, showToast]
  )

  // Fetch when tab becomes active
  useEffect(() => {
    let isCancelled = false
    if (adminSubTab === 'customers' && customers.length === 0) {
      Promise.resolve().then(() => {
        if (!isCancelled) void loadCustomers()
      })
    } else if (adminSubTab === 'feedback' && feedback.length === 0) {
      Promise.resolve().then(() => {
        if (!isCancelled) void loadFeedback()
      })
    }
    return () => {
      isCancelled = true
    }
  }, [adminSubTab, customers.length, feedback.length, loadCustomers, loadFeedback])

  const pendingPaymentsCount = (payments || []).filter((p) => p?.status === 'PENDING').length
  const activeOrdersCount =
    orderCounts?.active ??
    (orders || []).filter((o) => ['CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED'].includes(o?.status)).length
  const readyForDeliveryCount = (orders || []).filter((o) => o?.status === 'READY').length
  const pendingFeedbackCount = (feedback || []).filter((f) => f?.status === 'PENDING').length
  const totalNotifications = pendingPaymentsCount + pendingFeedbackCount

  const handleRefreshAll = () => {
    onRefreshOrders()
    onRefreshPayments()
    void loadCustomers()
    void loadFeedback()
    if (onRetryAdmin) onRetryAdmin()
    showToast('Dashboard data refreshed')
  }

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    const q = searchQuery.trim()
    if (adminSubTab === 'orders') {
      onRefreshOrders({ search: q })
    } else if (adminSubTab === 'customers') {
      void loadCustomers(q)
    } else if (adminSubTab === 'feedback') {
      void loadFeedback(undefined, q)
    } else {
      // Default to orders search
      onSelectSubTab('orders')
      onRefreshOrders({ search: q })
    }
  }

  // Sidebar navigation sections matching Metis reference
  const navSections: Array<{
    title: string
    items: Array<{
      id: AdminSubTab
      label: string
      icon: React.ReactNode
      badge?: number
      badgeColor?: string
    }>
  }> = [
    {
      title: 'OPERATIONAL COMMAND',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon size={18} /> },
        { id: 'orders', label: 'Orders', icon: <OrdersIcon size={18} />, badge: activeOrdersCount, badgeColor: '#2563eb' },
        { id: 'delivery', label: 'Delivery Queue', icon: <DeliveryIcon size={18} />, badge: readyForDeliveryCount, badgeColor: '#059669' },
        { id: 'payments', label: 'Payments', icon: <PaymentsIcon size={18} />, badge: pendingPaymentsCount, badgeColor: '#f59e0b' },
      ],
    },
    {
      title: 'MENU & AUDIT',
      items: [
        { id: 'products', label: 'Menu Dishes', icon: <ProductsIcon size={18} />, badge: products.length },
        { id: 'categories', label: 'Categories', icon: <CategoriesIcon size={18} />, badge: categories.length },
        { id: 'customers', label: 'Customers', icon: <CustomersIcon size={18} />, badge: customers.length || adminStats?.totalCustomers },
        { id: 'reports', label: 'Reports & Audits', icon: <ReportsIcon size={18} /> },
        { id: 'feedback', label: 'Feedback Inquiries', icon: <FeedbackIcon size={18} />, badge: pendingFeedbackCount, badgeColor: '#e11d48' },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'settings', label: 'Restaurant Settings', icon: <SettingsIcon size={18} /> },
        { id: 'users', label: 'Staff & Roles', icon: <UsersIcon size={18} /> },
      ],
    },
  ]

  if (isLoadingAdmin) {
    return (
      <div className="metis-loading-screen">
        <div className="spinner-large" />
        <h2>Verifying Admin Authorization</h2>
        <p>Loading secure back-office command center...</p>
      </div>
    )
  }

  if (adminError) {
    return (
      <div className="metis-error-screen">
        <UnauthorizedBanner
          adminError={adminError}
          userRole={userRole}
          onReturnToCart={onReturnToStorefront}
          onRetry={onRetryAdmin}
        />
      </div>
    )
  }

  return (
    <div className={`metis-admin-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* 1. LEFT SIDEBAR */}
      <aside className={`metis-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="metis-sidebar-brand">
          <div className="metis-brand-content" onClick={onReturnToStorefront} title="BiteFlow Home">
            <img src="/Bitelogo.png" alt="BiteFlow" className="metis-logo-img" />
            {!isSidebarCollapsed && (
              <div className="metis-brand-text">
                <span className="metis-brand-title">BiteFlow</span>
                <span className="metis-brand-badge">ADMIN</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="metis-collapse-toggle"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar width"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="metis-sidebar-nav">
          {navSections.map((sec) => (
            <div key={sec.title} className="metis-nav-section">
              {!isSidebarCollapsed && <div className="metis-nav-section-title">{sec.title}</div>}
              {sec.items.map((item) => {
                const isActive = adminSubTab === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`metis-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      onSelectSubTab(item.id)
                      setIsMobileMenuOpen(false)
                    }}
                    title={item.label}
                  >
                    <span className="metis-nav-icon">{item.icon}</span>
                    {!isSidebarCollapsed && <span className="metis-nav-label">{item.label}</span>}
                    {!isSidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                      <span
                        className="metis-nav-badge"
                        style={{ backgroundColor: item.badgeColor || 'var(--btn-yellow, #f59e0b)' }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Bottom Storefront Action */}
        <div className="metis-sidebar-footer">
          <button
            type="button"
            className="metis-return-storefront-btn"
            onClick={onReturnToStorefront}
            title="Return to customer ordering storefront"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {!isSidebarCollapsed && <span>View Storefront</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div className="metis-mobile-backdrop" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* 2. MAIN APP CANVAS */}
      <div className="metis-main-container">
        {/* Top Management Header Bar */}
        <header className="metis-topbar">
          <div className="metis-topbar-left">
            <button
              type="button"
              className="metis-mobile-hamburger"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open mobile navigation menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Global Spotlight Search */}
            <form className="metis-search-form" onSubmit={handleGlobalSearch}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search orders, customers, dishes... (Enter to filter)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="metis-search-input"
              />
            </form>
          </div>

          <div className="metis-topbar-right">
            {/* Quick Action: New Dish Shortcut */}
            <button
              type="button"
              className="metis-action-btn-primary"
              onClick={onAddProduct}
              title="Add a new dish to restaurant menu"
            >
              <span>+ New Dish</span>
            </button>

            {/* Refresh Data */}
            <button
              type="button"
              className="metis-icon-action"
              onClick={handleRefreshAll}
              title="Refresh all real-time operational data"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </button>

            {/* Dark / Light Theme Toggle */}
            <div className="metis-theme-wrapper" title="Toggle Light / Dark Mode">
              <ThemeToggle />
            </div>

            {/* Notification Bell with Badge */}
            <div
              className="metis-icon-action metis-bell-wrapper"
              onClick={() => onSelectSubTab(pendingPaymentsCount > 0 ? 'payments' : 'orders')}
              title={`${totalNotifications} items requiring admin attention`}
            >
              <BellIcon size={18} />
              {totalNotifications > 0 && <span className="metis-bell-badge">{totalNotifications}</span>}
            </div>

            {/* Admin Profile Pill */}
            <div className="metis-profile-pill">
              <div className="metis-avatar">A</div>
              <div className="metis-profile-info">
                <span className="metis-profile-name">Restaurant Admin</span>
                <span className="metis-profile-role">Manager</span>
              </div>
            </div>
          </div>
        </header>

        {/* Sub-view Content Canvas */}
        <main className="metis-canvas-body">
          {adminSubTab === 'dashboard' && (
            <AdminDashboardView
              stats={adminStats}
              categories={categories}
              products={products}
              orders={orders}
              payments={payments}
              onNavigateTab={onSelectSubTab}
              onInspectOrder={onInspectOrder}
              onVerifyPayment={onVerifyPayment}
              onRefreshAll={handleRefreshAll}
              isLoading={isLoadingOrders || isLoadingPayments}
            />
          )}

          {adminSubTab === 'orders' && (
            <AdminOrdersTable
              orders={orders}
              counts={orderCounts}
              isLoading={isLoadingOrders}
              onUpdateStatus={onUpdateOrderStatus}
              onInspectOrder={onInspectOrder}
              onRefresh={onRefreshOrders}
            />
          )}

          {adminSubTab === 'delivery' && (
            <AdminDeliveryView
              orders={orders}
              isLoading={isLoadingOrders}
              onUpdateStatus={onUpdateOrderStatus}
              onInspectOrder={onInspectOrder}
              onRefresh={() => onRefreshOrders()}
            />
          )}

          {adminSubTab === 'payments' && (
            <AdminPaymentsTable
              payments={payments}
              isLoading={isLoadingPayments}
              onVerifyPayment={onVerifyPayment}
              onRejectPayment={onRejectPayment}
              onViewAudit={onViewAudit}
              onRefresh={onRefreshPayments}
            />
          )}

          {adminSubTab === 'products' && (
            <AdminProductsTable
              products={products}
              onAddProduct={onAddProduct}
              onToggleAvailability={onToggleProductAvailability}
              onEditProduct={onEditProduct}
              onDeleteProduct={onDeleteProduct}
            />
          )}

          {adminSubTab === 'categories' && (
            <AdminCategoriesTable
              categories={categories}
              onAddCategory={onAddCategory}
              onEditCategory={onEditCategory}
              onDeleteCategory={onDeleteCategory}
            />
          )}

          {adminSubTab === 'customers' && (
            <AdminCustomersTable
              customers={customers}
              isLoading={isLoadingCustomers}
              onRefresh={loadCustomers}
              onInspectOrder={onInspectOrder}
              onLoadCustomerDetail={handleLoadCustomerDetail}
            />
          )}

          {adminSubTab === 'reports' && <AdminReportsView getToken={getToken} />}

          {adminSubTab === 'feedback' && (
            <AdminFeedbackTable
              feedback={feedback}
              isLoading={isLoadingFeedback}
              onRefresh={loadFeedback}
              onUpdateStatus={handleUpdateFeedbackStatus}
            />
          )}

          {adminSubTab === 'settings' && (
            <AdminSettingsView
              getToken={getToken}
              showToast={showToast}
              onSettingsUpdated={onSettingsUpdated}
            />
          )}

          {adminSubTab === 'users' && (
            <AdminUsersTable
              users={adminUsers}
              onRoleChange={onRoleChange}
            />
          )}
        </main>
      </div>
    </div>
  )
}
