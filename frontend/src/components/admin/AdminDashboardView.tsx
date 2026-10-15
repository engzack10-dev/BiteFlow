import type {
  AdminStats,
  OrderRecord,
  PaymentRecord,
  Category,
  Product,
} from '../../types/index.js'
import type { AdminSubTab } from './AdminTabNav.js'
import {
  DollarSignIcon,
  PackageIcon,
  ChefHatIcon,
  DeliveryIcon,
  CheckCircleIcon,
  UsersIcon,
  ProductsIcon,
  PaymentsIcon,
  FeedbackIcon,
} from '../common/AdminIcons.js'

interface AdminDashboardViewProps {
  stats: AdminStats | null
  categories: Category[]
  products: Product[]
  orders: OrderRecord[]
  payments: PaymentRecord[]
  onNavigateTab: (tab: AdminSubTab) => void
  onInspectOrder: (order: OrderRecord) => void
  onVerifyPayment: (payment: PaymentRecord) => void
  onRefreshAll: () => void
  isLoading?: boolean
}

export function AdminDashboardView({
  stats,
  categories,
  products,
  orders,
  payments,
  onNavigateTab,
  onInspectOrder,
  onVerifyPayment,
  onRefreshAll,
  isLoading = false,
}: AdminDashboardViewProps) {
  // Derive counts from stats or orders/payments
  const pendingPayments = (payments || []).filter((p) => p.status === 'PENDING')
  const pendingPaymentsCount = stats?.payments?.pending ?? pendingPayments.length

  const readyOrders = (orders || []).filter((o) => o.status === 'READY')
  const readyCount = stats?.orders?.ready ?? readyOrders.length

  const preparingOrders = (orders || []).filter((o) => o.status === 'PREPARING')
  const preparingCount = stats?.orders?.preparing ?? preparingOrders.length

  const dispatchedOrders = (orders || []).filter((o) => o.status === 'DISPATCHED')
  const dispatchedCount = stats?.orders?.dispatched ?? dispatchedOrders.length

  const deliveredOrders = (orders || []).filter((o) => o.status === 'DELIVERED')
  const deliveredCount = stats?.orders?.delivered ?? deliveredOrders.length

  const pendingPaymentOrders = (orders || []).filter((o) => o.status === 'PENDING_PAYMENT')
  const pendingPaymentOrdersCount = stats?.orders?.pendingPayment ?? pendingPaymentOrders.length

  // Financial truth: Strictly from verified payments
  const verifiedRevenue =
    stats?.financial?.verifiedRevenue ??
    orders
      .filter((o) => o.paymentStatus === 'VERIFIED')
      .reduce((sum, o) => sum + o.totalAmount, 0)

  const pendingRevenue =
    stats?.financial?.pendingRevenue ??
    orders
      .filter((o) => o.paymentStatus === 'PENDING')
      .reduce((sum, o) => sum + o.totalAmount, 0)

  const totalOrdersCount = stats?.orders?.total ?? orders.length
  const totalCustomers = stats?.totalCustomers ?? 0
  const pendingFeedback = stats?.feedback?.pending ?? 0

  const recentOrders = orders.slice(0, 5)
  const recentPayments = payments.slice(0, 5)

  return (
    <div className="admin-dashboard-view">
      {/* Top Banner / Actions */}
      <div className="dashboard-top-banner">
        <div>
          <span className="dashboard-status-pill">
            Restaurant Status: <strong>{stats?.restaurantStatus || 'OPEN'}</strong>
          </span>
          <h2 className="dashboard-welcome-heading">Operational Command Center</h2>
          <p className="dashboard-welcome-sub">
            Live overview of kitchen prep, order dispatch, payment verification, and revenue.
          </p>
        </div>
        <button
          type="button"
          className="btn-refresh-orders"
          onClick={onRefreshAll}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : '↻ Refresh Data'}
        </button>
      </div>

      {/* Action Alerts if items need immediate attention */}
      <div className="dashboard-alerts-grid">
        {pendingPaymentsCount > 0 && (
          <div className="dashboard-alert-card alert-warning">
            <div className="alert-card-icon">
              <PaymentsIcon size={24} />
            </div>
            <div className="alert-card-info">
              <h4>{pendingPaymentsCount} Payments Awaiting Verification</h4>
              <p>Customers have submitted payment proofs that require administrative review.</p>
            </div>
            <button
              type="button"
              className="btn-alert-action"
              onClick={() => onNavigateTab('payments')}
            >
              Verify Queue →
            </button>
          </div>
        )}

        {readyCount > 0 && (
          <div className="dashboard-alert-card alert-success">
            <div className="alert-card-icon">
              <DeliveryIcon size={24} />
            </div>
            <div className="alert-card-info">
              <h4>{readyCount} Orders Ready for Dispatch</h4>
              <p>Kitchen preparation complete. Ready for courier pick-up and delivery dispatch.</p>
            </div>
            <button
              type="button"
              className="btn-alert-action"
              onClick={() => onNavigateTab('delivery')}
            >
              Open Delivery →
            </button>
          </div>
        )}

        {pendingFeedback > 0 && (
          <div className="dashboard-alert-card alert-info">
            <div className="alert-card-icon">
              <FeedbackIcon size={24} />
            </div>
            <div className="alert-card-info">
              <h4>{pendingFeedback} Unreviewed Customer Inquiries</h4>
              <p>New messages or questions received from the customer storefront.</p>
            </div>
            <button
              type="button"
              className="btn-alert-action"
              onClick={() => onNavigateTab('feedback')}
            >
              Review Inquiries →
            </button>
          </div>
        )}
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="dashboard-kpi-grid">
        <div className="dashboard-kpi-card card-revenue">
          <div className="kpi-header">
            <span className="kpi-title">Verified Revenue</span>
            <span className="kpi-icon kpi-icon-green">
              <DollarSignIcon size={18} />
            </span>
          </div>
          <div className="kpi-value">${verifiedRevenue.toFixed(2)}</div>
          <div className="kpi-caption">
            Strictly from verified transactions
            {pendingRevenue > 0 && (
              <span className="kpi-sub-alert"> (${pendingRevenue.toFixed(2)} pending review)</span>
            )}
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Orders</span>
            <span className="kpi-icon kpi-icon-blue">
              <PackageIcon size={18} />
            </span>
          </div>
          <div className="kpi-value">{totalOrdersCount}</div>
          <div className="kpi-caption">
            {pendingPaymentOrdersCount > 0 ? `${pendingPaymentOrdersCount} awaiting payment` : 'All time orders'}
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">In Kitchen</span>
            <span className="kpi-icon kpi-icon-orange">
              <ChefHatIcon size={18} />
            </span>
          </div>
          <div className="kpi-value" style={{ color: '#ea580c' }}>
            {preparingCount}
          </div>
          <div className="kpi-caption">Orders actively being prepared</div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Ready & Dispatched</span>
            <span className="kpi-icon kpi-icon-indigo">
              <DeliveryIcon size={18} />
            </span>
          </div>
          <div className="kpi-value" style={{ color: '#2563eb' }}>
            {readyCount + dispatchedCount}
          </div>
          <div className="kpi-caption">
            {readyCount} ready &bull; {dispatchedCount} on the road
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Delivered Orders</span>
            <span className="kpi-icon kpi-icon-emerald">
              <CheckCircleIcon size={18} />
            </span>
          </div>
          <div className="kpi-value" style={{ color: '#059669' }}>
            {deliveredCount}
          </div>
          <div className="kpi-caption">Successfully completed deliveries</div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Customer Base</span>
            <span className="kpi-icon kpi-icon-purple">
              <UsersIcon size={18} />
            </span>
          </div>
          <div className="kpi-value">{totalCustomers}</div>
          <div className="kpi-caption">Registered customer accounts</div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Menu Catalog</span>
            <span className="kpi-icon kpi-icon-amber">
              <ProductsIcon size={18} />
            </span>
          </div>
          <div className="kpi-value">{products.length}</div>
          <div className="kpi-caption">
            {products.filter((p) => p.isAvailable).length} available &bull; {categories.length} categories
          </div>
        </div>

        <div className="dashboard-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Payment Queue</span>
            <span className="kpi-icon kpi-icon-yellow">
              <PaymentsIcon size={18} />
            </span>
          </div>
          <div className="kpi-value" style={{ color: pendingPaymentsCount > 0 ? '#d97706' : '#6b7280' }}>
            {pendingPaymentsCount}
          </div>
          <div className="kpi-caption">
            {pendingPaymentsCount > 0 ? 'Requires admin verification' : 'Queue clear'}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Orders & Recent Payments */}
      <div className="dashboard-activity-split">
        {/* Recent Orders Box */}
        <div className="dashboard-section-box">
          <div className="section-box-header">
            <div>
              <h3 className="section-box-title">Recent Orders</h3>
              <p className="section-box-desc">Latest placed and active orders</p>
            </div>
            <button
              type="button"
              className="btn-view-all"
              onClick={() => onNavigateTab('orders')}
            >
              View All Orders →
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="dashboard-empty-notice">No orders recorded yet.</div>
          ) : (
            <div className="dashboard-activity-list">
              {recentOrders.map((order) => (
                <div
                  key={order.orderNumber}
                  className="activity-item-row"
                  onClick={() => onInspectOrder(order)}
                >
                  <div className="activity-item-main">
                    <span className="activity-ref">{order.orderNumber}</span>
                    <span className="activity-customer">
                      {order.customerName} ({order.customerPhone})
                    </span>
                  </div>
                  <div className="activity-item-status">
                    <span className={`status-badge status-${order.status.toLowerCase()}`}>
                      {order.status}
                    </span>
                    <span className="activity-amount">${order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments Box */}
        <div className="dashboard-section-box">
          <div className="section-box-header">
            <div>
              <h3 className="section-box-title">Recent Payments</h3>
              <p className="section-box-desc">Verification queue & receipts</p>
            </div>
            <button
              type="button"
              className="btn-view-all"
              onClick={() => onNavigateTab('payments')}
            >
              View All Payments →
            </button>
          </div>

          {recentPayments.length === 0 ? (
            <div className="dashboard-empty-notice">No payments submitted yet.</div>
          ) : (
            <div className="dashboard-activity-list">
              {recentPayments.map((payment) => (
                <div key={payment.id || payment.paymentNumber} className="activity-item-row">
                  <div className="activity-item-main">
                    <span className="activity-ref">{payment.paymentNumber}</span>
                    <span className="activity-customer">
                      Order: {payment.orderNumber} &bull; {payment.customerName}
                    </span>
                  </div>
                  <div className="activity-item-status">
                    <span className={`payment-badge payment-${payment.status.toLowerCase()}`}>
                      {payment.status}
                    </span>
                    <span className="activity-amount">${payment.amount.toFixed(2)}</span>
                    {payment.status === 'PENDING' && (
                      <button
                        type="button"
                        className="btn-quick-verify"
                        onClick={() => onVerifyPayment(payment)}
                      >
                        Verify
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
