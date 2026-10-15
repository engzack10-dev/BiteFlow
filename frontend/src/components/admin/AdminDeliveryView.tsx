import { useState, useMemo } from 'react'
import type { OrderRecord, OrderStatus } from '../../types/index.js'
import { DeliveryIcon, CheckCircleIcon, PhoneIcon } from '../common/AdminIcons.js'

interface AdminDeliveryViewProps {
  orders: OrderRecord[]
  isLoading: boolean
  onUpdateStatus: (orderId: string, nextStatus: OrderStatus, note?: string) => Promise<void>
  onInspectOrder: (order: OrderRecord) => void
  onRefresh: () => void
}

type DeliveryFilterTab = 'all' | 'ready' | 'dispatched' | 'delivered'

export function AdminDeliveryView({
  orders,
  isLoading,
  onUpdateStatus,
  onInspectOrder,
  onRefresh,
}: AdminDeliveryViewProps) {
  const [filterTab, setFilterTab] = useState<DeliveryFilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    order: OrderRecord
    nextStatus: OrderStatus
    actionTitle: string
    promptText: string
  } | null>(null)

  // Filter orders relevant to delivery fulfillment
  const deliveryOrders = useMemo(() => {
    return orders.filter((o) => ['READY', 'DISPATCHED', 'DELIVERED'].includes(o.status))
  }, [orders])

  const counts = useMemo(() => {
    return {
      all: deliveryOrders.length,
      ready: deliveryOrders.filter((o) => o.status === 'READY').length,
      dispatched: deliveryOrders.filter((o) => o.status === 'DISPATCHED').length,
      delivered: deliveryOrders.filter((o) => o.status === 'DELIVERED').length,
    }
  }, [deliveryOrders])

  const filteredOrders = useMemo(() => {
    let result = deliveryOrders

    if (filterTab === 'ready') {
      result = result.filter((o) => o.status === 'READY')
    } else if (filterTab === 'dispatched') {
      result = result.filter((o) => o.status === 'DISPATCHED')
    } else if (filterTab === 'delivered') {
      result = result.filter((o) => o.status === 'DELIVERED')
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.toLowerCase().includes(q) ||
          o.deliveryAddress.toLowerCase().includes(q) ||
          o.deliveryArea.toLowerCase().includes(q)
      )
    }

    return result
  }, [deliveryOrders, filterTab, searchQuery])

  const handleExecuteStatusTransition = async () => {
    if (!confirmAction) return
    setIsUpdating(true)
    try {
      const id = confirmAction.order.id || confirmAction.order._id || confirmAction.order.orderNumber
      await onUpdateStatus(id, confirmAction.nextStatus)
      setConfirmAction(null)
    } finally {
      setIsUpdating(false)
    }
  }

  const formatTimestamp = (iso?: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="admin-delivery-view">
      {/* Header bar */}
      <div className="delivery-view-header">
        <div>
          <h2 className="admin-section-heading">Delivery Management</h2>
          <p className="admin-section-sub">
            Track courier fulfillment, delivery addresses, dispatch timing, and completion.
          </p>
        </div>
        <button
          type="button"
          className="btn-refresh-orders"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : '↻ Refresh Delivery'}
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="delivery-controls-bar">
        <div className="delivery-tabs-pills">
          <button
            type="button"
            className={`filter-pill-btn ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            All Fulfillment ({counts.all})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterTab === 'ready' ? 'active' : ''}`}
            onClick={() => setFilterTab('ready')}
          >
            Ready for Courier ({counts.ready})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterTab === 'dispatched' ? 'active' : ''}`}
            onClick={() => setFilterTab('dispatched')}
          >
            Out for Delivery ({counts.dispatched})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterTab === 'delivered' ? 'active' : ''}`}
            onClick={() => setFilterTab('delivered')}
          >
            Delivered ({counts.delivered})
          </button>
        </div>

        <div className="delivery-search-wrapper">
          <input
            type="text"
            className="input-text delivery-search-input"
            placeholder="Search address, customer, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Orders Grid or Empty State */}
      {filteredOrders.length === 0 ? (
        <div className="customer-orders-empty" style={{ margin: '2rem 0' }}>
          <div className="empty-orders-icon">
            <DeliveryIcon size={36} />
          </div>
          <h3 className="empty-orders-title">No Orders in this Delivery Stage</h3>
          <p className="empty-orders-desc">
            {filterTab === 'ready'
              ? 'No orders currently waiting for courier pickup.'
              : filterTab === 'dispatched'
              ? 'No orders actively on the road for delivery.'
              : 'Orders ready for courier pickup or on the road will appear here.'}
          </p>
        </div>
      ) : (
        <div className="delivery-cards-grid">
          {filteredOrders.map((order) => {
            const isReady = order.status === 'READY'
            const isDispatched = order.status === 'DISPATCHED'
            const isDelivered = order.status === 'DELIVERED'

            return (
              <div
                key={order.orderNumber}
                className={`delivery-order-card card-status-${order.status.toLowerCase()}`}
              >
                <div className="delivery-card-top">
                  <div>
                    <span className="order-number-text">{order.orderNumber}</span>
                    <span className="delivery-time-placed">
                      Placed: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className={`status-badge status-${order.status.toLowerCase()}`}>
                    {order.status === 'READY'
                      ? 'Ready for Courier'
                      : order.status === 'DISPATCHED'
                      ? 'Out for Delivery'
                      : 'Delivered'}
                  </span>
                </div>

                {/* Recipient & Address Box */}
                <div className="delivery-card-address-box">
                  <div className="delivery-recipient-name">
                    <strong>{order.customerName}</strong>
                    <span className="delivery-phone" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <PhoneIcon size={12} style={{ opacity: 0.7 }} />
                      <span>{order.customerPhone}</span>
                    </span>
                  </div>
                  <div className="delivery-destination">
                    📍 <strong>{order.deliveryArea}</strong> — {order.deliveryAddress}
                  </div>
                  {order.deliveryInstructions ? (
                    <div className="delivery-instructions-box">
                      📝 <em>"{order.deliveryInstructions}"</em>
                    </div>
                  ) : null}
                </div>

                {/* Items & Timestamps */}
                <div className="delivery-card-meta-row">
                  <div>
                    <span className="info-label">Items:</span>{' '}
                    <span className="info-value">
                      {order.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </span>
                  </div>
                  <div className="delivery-timestamps-block">
                    {order.dispatchedAt && (
                      <span className="timestamp-pill">
                        Dispatched: {formatTimestamp(order.dispatchedAt)}
                      </span>
                    )}
                    {order.deliveredAt && (
                      <span className="timestamp-pill">
                        Delivered: {formatTimestamp(order.deliveredAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="delivery-card-actions">
                  <button
                    type="button"
                    className="btn-action btn-inspect"
                    onClick={() => onInspectOrder(order)}
                  >
                    Details & Audit
                  </button>

                  {isReady && (
                    <button
                      type="button"
                      className="btn-action btn-dispatch-action"
                      onClick={() =>
                        setConfirmAction({
                          order,
                          nextStatus: 'DISPATCHED',
                          actionTitle: 'Dispatch Order for Delivery',
                          promptText: `Confirm courier pickup and dispatch order ${order.orderNumber} to ${order.deliveryArea}?`,
                        })
                      }
                    >
                      <DeliveryIcon size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      <span>Dispatch for Delivery</span>
                    </button>
                  )}

                  {isDispatched && (
                    <button
                      type="button"
                      className="btn-action btn-deliver-action"
                      onClick={() =>
                        setConfirmAction({
                          order,
                          nextStatus: 'DELIVERED',
                          actionTitle: 'Confirm Customer Delivery',
                          promptText: `Confirm that order ${order.orderNumber} was successfully received by ${order.customerName}?`,
                        })
                      }
                    >
                      <CheckCircleIcon size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                      <span>Mark Delivered</span>
                    </button>
                  )}

                  {isDelivered && (
                    <span className="delivered-check-badge">
                      ✓ Completed
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmation Modal for Delivery Status Change */}
      {confirmAction && (
        <div className="modal-overlay" onClick={() => !isUpdating && setConfirmAction(null)}>
          <div
            className="modal-card"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">{confirmAction.actionTitle}</h3>
              <p className="modal-subtitle">{confirmAction.promptText}</p>
            </div>
            <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-action btn-back-cart"
                onClick={() => setConfirmAction(null)}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-action btn-checkout"
                onClick={handleExecuteStatusTransition}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating Status...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
