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
import { AdminTabNav, type AdminSubTab } from '../components/admin/AdminTabNav.js'
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

  const handleRefreshAll = () => {
    onRefreshOrders()
    onRefreshPayments()
    void loadCustomers()
    void loadFeedback()
    if (onRetryAdmin) onRetryAdmin()
  }

  return (
    <div className="admin-portal">
      {/* Top Header */}
      <div className="admin-header">
        <div>
          <span className="customer-orders-subtitle">Restaurant Operations</span>
          <h1 className="admin-title">BiteFlow Admin Portal</h1>
          <p style={{ color: 'var(--text-muted, #6b7280)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Unified management for orders, kitchen, delivery, payments, catalog, customers, reports, and settings.
          </p>
        </div>
        <button
          type="button"
          className="btn-action btn-continue"
          onClick={onReturnToStorefront}
          title="Return to customer storefront"
        >
          &larr; Return to Storefront
        </button>
      </div>

      {isLoadingAdmin ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div className="spinner-large" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
            Verifying administrative security credentials...
          </p>
        </div>
      ) : adminError ? (
        <UnauthorizedBanner
          adminError={adminError}
          userRole={userRole}
          onReturnToCart={onReturnToStorefront}
          onRetry={onRetryAdmin}
        />
      ) : (
        <>
          {/* Unified 10-Area Navigation Bar */}
          <AdminTabNav
            activeSubTab={adminSubTab}
            onSelectSubTab={onSelectSubTab}
            productsCount={products.length}
            categoriesCount={categories.length}
            pendingPaymentsCount={pendingPaymentsCount}
            activeOrdersCount={activeOrdersCount}
            readyForDeliveryCount={readyForDeliveryCount}
            pendingFeedbackCount={pendingFeedbackCount}
            customersCount={customers.length || adminStats?.totalCustomers || 0}
          />

          {/* 1. Dashboard View */}
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

          {/* 2. Orders Management View */}
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

          {/* 3. Delivery Management View */}
          {adminSubTab === 'delivery' && (
            <AdminDeliveryView
              orders={orders}
              isLoading={isLoadingOrders}
              onUpdateStatus={onUpdateOrderStatus}
              onInspectOrder={onInspectOrder}
              onRefresh={onRefreshOrders}
            />
          )}

          {/* 4. Payments Queue View */}
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

          {/* 5. Products Management View */}
          {adminSubTab === 'products' && (
            <AdminProductsTable
              products={products}
              onAddProduct={onAddProduct}
              onToggleAvailability={onToggleProductAvailability}
              onEditProduct={onEditProduct}
              onDeleteProduct={onDeleteProduct}
            />
          )}

          {/* 6. Categories Management View */}
          {adminSubTab === 'categories' && (
            <AdminCategoriesTable
              categories={categories}
              onAddCategory={onAddCategory}
              onEditCategory={onEditCategory}
              onDeleteCategory={onDeleteCategory}
            />
          )}

          {/* 7. Customers Directory View */}
          {adminSubTab === 'customers' && (
            <AdminCustomersTable
              customers={customers}
              isLoading={isLoadingCustomers}
              onRefresh={loadCustomers}
              onInspectOrder={onInspectOrder}
              onLoadCustomerDetail={handleLoadCustomerDetail}
            />
          )}

          {/* 8. Reports & Sales Performance View */}
          {adminSubTab === 'reports' && (
            <AdminReportsView getToken={getToken} />
          )}

          {/* 9. Feedback & Inquiries View */}
          {adminSubTab === 'feedback' && (
            <AdminFeedbackTable
              feedback={feedback}
              isLoading={isLoadingFeedback}
              onUpdateStatus={handleUpdateFeedbackStatus}
              onRefresh={loadFeedback}
            />
          )}

          {/* 10. Restaurant Settings View */}
          {adminSubTab === 'settings' && (
            <AdminSettingsView
              getToken={getToken}
              showToast={showToast}
              onSettingsUpdated={onSettingsUpdated}
            />
          )}

          {/* Secondary: User Roles Administration */}
          {adminSubTab === 'users' && (
            <AdminUsersTable
              users={adminUsers}
              onRoleChange={onRoleChange}
            />
          )}
        </>
      )}
    </div>
  )
}
