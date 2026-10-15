import { useState, useEffect, useCallback, useMemo } from 'react'
import type { OrderRecord, OrderStatus } from '../../types/index.js'
import { api } from '../../api/client.js'
import { CustomerOrderDetailsModal } from './CustomerOrderDetailsModal.js'

interface CustomerOrdersPageProps {
  getToken: () => Promise<string | null>
  isSignedIn: boolean
  onNavigateToMenu: () => void
  initialSelectedOrderId?: string | null
}

type FilterTab = 'all' | 'active' | 'delivered'

const ACTIVE_STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DISPATCHED',
]

export function CustomerOrdersPage({
  getToken,
  isSignedIn,
  onNavigateToMenu,
  initialSelectedOrderId,
}: CustomerOrdersPageProps) {
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null)

  const handleManualRefreshOrders = useCallback(async () => {
    if (!isSignedIn) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.getMyOrders(getToken)
      setOrders(res.orders || [])
    } catch (err) {
      const e = err as Error
      setError(e.message || 'Failed to load your orders. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [isSignedIn, getToken])

  const handleRefreshSingleOrder = useCallback(
    async (orderId: string) => {
      const res = await api.getOrder(getToken, orderId)
      if (res?.order) {
        setSelectedOrder(res.order)
        setOrders((prev) =>
          prev.map((o) =>
            o.id === res.order.id || o.orderNumber === res.order.orderNumber ? res.order : o
          )
        )
      }
    },
    [getToken]
  )

  useEffect(() => {
    let isCancelled = false
    if (!isSignedIn) {
      Promise.resolve().then(() => {
        if (!isCancelled) setIsLoading(false)
      })
      return
    }

    Promise.resolve().then(() => {
      if (!isCancelled) {
        setIsLoading(true)
        setError(null)
      }
    })

    api
      .getMyOrders(getToken)
      .then((res) => {
        if (!isCancelled) {
          const fetched = res.orders || []
          setOrders(fetched)
          if (initialSelectedOrderId) {
            const found = fetched.find(
              (o) => o.id === initialSelectedOrderId || o.orderNumber === initialSelectedOrderId
            )
            if (found) setSelectedOrder(found)
          }
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          const e = err as Error
          setError(e.message || 'Failed to load your orders. Please try again.')
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [isSignedIn, getToken, initialSelectedOrderId])

  // Filter orders
  const filteredOrders = useMemo(() => {
    if (filterTab === 'active') {
      return orders.filter((o) => ACTIVE_STATUSES.includes(o.status))
    }
    if (filterTab === 'delivered') {
      return orders.filter((o) => o.status === 'DELIVERED')
    }
    return orders
  }, [orders, filterTab])

  const activeCount = useMemo(
    () => orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
    [orders]
  )
  const deliveredCount = useMemo(
    () => orders.filter((o) => o.status === 'DELIVERED').length,
    [orders]
  )

  const getOrderStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return <span className="status-badge status-pending">Awaiting Payment</span>
      case 'CONFIRMED':
        return <span className="status-badge status-confirmed">Confirmed</span>
      case 'PREPARING':
        return <span className="status-badge status-preparing">Kitchen Preparing</span>
      case 'READY':
        return <span className="status-badge status-ready">Ready for Delivery</span>
      case 'DISPATCHED':
        return <span className="status-badge status-dispatched">Out for Delivery</span>
      case 'DELIVERED':
        return <span className="status-badge status-delivered">Delivered</span>
      default:
        return <span className="status-badge">{status}</span>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <span className="payment-badge payment-verified">Payment Verified</span>
      case 'REJECTED':
        return <span className="payment-badge payment-rejected">Payment Rejected</span>
      case 'PENDING':
      default:
        return <span className="payment-badge payment-pending">Payment Review Pending</span>
    }
  }

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—'
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isSignedIn) {
    return (
      <div className="customer-orders-container" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Customer Sign-In Required
        </h2>
        <p style={{ color: 'var(--text-muted, #64748b)', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
          Please sign in to your BiteFlow customer account to track active kitchen preparation and review your past delivered orders.
        </p>
        <button
          type="button"
          className="btn-action btn-checkout"
          onClick={onNavigateToMenu}
        >
          Explore Menu
        </button>
      </div>
    )
  }

  return (
    <div className="customer-orders-page">
      <div className="customer-orders-container">
        {/* Header Title & Controls */}
        <div className="customer-orders-header">
          <div>
            <span className="customer-orders-subtitle">Order History & Live Progress</span>
            <h1 className="customer-orders-title">My Orders</h1>
          </div>
          <button
            type="button"
            className="btn-action btn-refresh-orders"
            onClick={handleManualRefreshOrders}
            disabled={isLoading}
            title="Refresh order history"
          >
            {isLoading ? 'Refreshing...' : '↻ Refresh Orders'}
          </button>
        </div>

        {/* Filter Pills */}
        <div className="orders-filter-bar" role="tablist" aria-label="Order Status Filters">
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === 'all'}
            className={`filter-pill-btn ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            All Orders ({orders.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === 'active'}
            className={`filter-pill-btn ${filterTab === 'active' ? 'active' : ''}`}
            onClick={() => setFilterTab('active')}
          >
            Active Orders ({activeCount})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filterTab === 'delivered'}
            className={`filter-pill-btn ${filterTab === 'delivered' ? 'active' : ''}`}
            onClick={() => setFilterTab('delivered')}
          >
            Delivered ({deliveredCount})
          </button>
        </div>

        {/* Error Notice with Retry */}
        {error && (
          <div className="error-banner" style={{ margin: '1.5rem 0' }}>
            <span>⚠️ {error}</span>
            <button
              type="button"
              className="btn-retry"
              onClick={handleManualRefreshOrders}
              style={{ marginLeft: '1rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton / Spinner */}
        {isLoading && orders.length === 0 ? (
          <div className="customer-orders-loading">
            <div className="spinner-large" />
            <p>Loading your orders & live status...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty State */
          <div className="customer-orders-empty">
            <div className="empty-orders-icon">📦</div>
            <h3 className="empty-orders-title">
              {filterTab === 'active'
                ? 'No Active Orders'
                : filterTab === 'delivered'
                ? 'No Delivered Orders Yet'
                : 'No Orders Yet'}
            </h3>
            <p className="empty-orders-desc">
              {filterTab === 'active'
                ? 'You do not have any orders in progress. Order delicious items fresh from our kitchen!'
                : filterTab === 'delivered'
                ? 'Orders you complete and receive will remain saved here for your records.'
                : 'You have not placed any orders yet. Discover our gourmet burgers, artisanal pizzas, and refreshing drinks!'}
            </p>
            <button
              type="button"
              className="btn-action btn-checkout"
              onClick={onNavigateToMenu}
              style={{ marginTop: '1.25rem' }}
            >
              Browse Menu & Order
            </button>
          </div>
        ) : (
          /* Orders List Grid */
          <div className="customer-orders-grid">
            {filteredOrders.map((order) => {
              const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
              const isActive = ACTIVE_STATUSES.includes(order.status)

              return (
                <div
                  key={order.id || order.orderNumber}
                  className={`customer-order-card ${isActive ? 'order-card-active' : ''}`}
                  onClick={() => setSelectedOrder(order)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View order ${order.orderNumber}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedOrder(order)
                    }
                  }}
                >
                  <div className="order-card-top">
                    <div>
                      <div className="order-card-ref">
                        <span className="order-number-text">{order.orderNumber}</span>
                        {isActive && <span className="active-pulse-indicator" title="Active Order" />}
                      </div>
                      <span className="order-card-date">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="order-card-badges">
                      {getOrderStatusBadge(order.status)}
                      {getPaymentStatusBadge(order.paymentStatus)}
                    </div>
                  </div>

                  {/* Summary Details */}
                  <div className="order-card-body">
                    <div className="order-card-items-preview">
                      <span className="items-count-badge">
                        {totalItems} {totalItems === 1 ? 'item' : 'items'}
                      </span>
                      <span className="items-names-snippet">
                        {order.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ') || 'No item details'}
                      </span>
                    </div>

                    <div className="order-card-info-row">
                      <span className="info-label">Deliver to:</span>
                      <span className="info-value">
                        {order.deliveryArea} ({order.deliveryAddress})
                      </span>
                    </div>
                  </div>

                  {/* Footer with Price and Track Action */}
                  <div className="order-card-footer">
                    <div>
                      <span className="order-total-label">Total Amount</span>
                      <span className="order-total-value">${order.totalAmount.toFixed(2)}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-track-action"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedOrder(order)
                      }}
                    >
                      {isActive ? '🚚 Live Track' : '📋 Order Details'} →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Customer Order Details & Tracking Modal */}
      {selectedOrder && (
        <CustomerOrderDetailsModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          onRefreshOrder={handleRefreshSingleOrder}
        />
      )}
    </div>
  )
}
