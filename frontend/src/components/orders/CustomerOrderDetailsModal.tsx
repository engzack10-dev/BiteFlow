import { useState, useEffect, useCallback } from 'react'
import type { OrderRecord } from '../../types/index.js'
import { OrderStatusTracker } from './OrderStatusTracker.js'

interface CustomerOrderDetailsModalProps {
  isOpen: boolean
  order: OrderRecord | null
  onClose: () => void
  onRefreshOrder: (orderId: string) => Promise<void>
}

export function CustomerOrderDetailsModal({
  isOpen,
  order,
  onClose,
  onRefreshOrder,
}: CustomerOrderDetailsModalProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date())

  const orderId = order ? order.id || order._id || order.orderNumber : ''
  const isTerminal = order?.status === 'DELIVERED' || order?.paymentStatus === 'REJECTED'

  // Manual refresh callback
  const handleManualRefresh = useCallback(async () => {
    if (!orderId || isRefreshing) return
    setIsRefreshing(true)
    setRefreshError(null)
    try {
      await onRefreshOrder(orderId)
      setLastRefreshedAt(new Date())
    } catch (err) {
      const e = err as Error
      setRefreshError(e.message || 'Failed to refresh order status')
    } finally {
      setIsRefreshing(false)
    }
  }, [orderId, isRefreshing, onRefreshOrder])

  // Smart Polling & Focus-Refetch Strategy
  useEffect(() => {
    if (!isOpen || !orderId || isTerminal) return

    // 1. Refetch on window focus
    const handleFocus = () => {
      void handleManualRefresh()
    }
    window.addEventListener('focus', handleFocus)

    // 2. Modest 10-second polling while order is active
    const interval = setInterval(() => {
      void handleManualRefresh()
    }, 10000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [isOpen, orderId, isTerminal, handleManualRefresh])

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !order) return null

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-order-details-title"
    >
      <div
        className="modal-card customer-order-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close order details modal"
        >
          &#10005;
        </button>

        {/* Modal Header */}
        <div className="modal-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', paddingRight: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span className="checkout-step-badge">Order Tracking</span>
              <h2 id="customer-order-details-title" className="modal-title" style={{ marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                Order #{order.orderNumber}
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Placed on: {order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
                <span style={{ margin: '0 0.5rem' }}>&bull;</span>
                Last checked: {lastRefreshedAt.toLocaleTimeString()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {!isTerminal && (
                <button
                  type="button"
                  className="btn-action btn-continue"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap' }}
                >
                  {isRefreshing ? 'Refreshing...' : '🔄 Refresh Status'}
                </button>
              )}
              <span
                className={`status-badge ${
                  order.paymentStatus === 'VERIFIED'
                    ? 'status-available'
                    : order.paymentStatus === 'REJECTED'
                    ? 'status-unavailable'
                    : 'status-pending'
                }`}
                style={{ fontSize: '0.75rem' }}
              >
                Payment: {order.paymentStatus}
              </span>
              <span
                className={`status-badge ${
                  order.status === 'DELIVERED'
                    ? 'status-available'
                    : order.status === 'CONFIRMED'
                    ? 'status-confirmed'
                    : order.status === 'PREPARING'
                    ? 'status-preparing'
                    : order.status === 'READY'
                    ? 'status-ready'
                    : order.status === 'DISPATCHED'
                    ? 'status-dispatched'
                    : 'status-pending'
                }`}
                style={{ fontSize: '0.75rem' }}
              >
                Order: {order.status}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ overflowY: 'auto', padding: '1.25rem 0' }}>
          {refreshError && (
            <div className="checkout-alert checkout-alert-error" style={{ marginBottom: '1rem' }}>
              {refreshError}
            </div>
          )}

          {/* 6-Step Visual Lifecycle Tracker Component */}
          <OrderStatusTracker order={order} />

          {/* Delivery & Contact Information Card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.25rem', marginBottom: '1.25rem' }}>
            <div className="audit-summary-box" style={{ margin: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-color, #1e293b)' }}>
                📍 Delivery Details
              </div>
              <div className="audit-summary-row">
                <span>Recipient:</span>
                <strong>{order.customerName}</strong>
              </div>
              <div className="audit-summary-row">
                <span>Contact Phone:</span>
                <span>{order.customerPhone}</span>
              </div>
              <div className="audit-summary-row">
                <span>Address:</span>
                <span>{order.deliveryAddress}</span>
              </div>
              <div className="audit-summary-row">
                <span>Area / District:</span>
                <span>{order.deliveryArea}</span>
              </div>
              {order.deliveryInstructions && (
                <div className="audit-summary-row">
                  <span>Instructions:</span>
                  <span style={{ fontStyle: 'italic', color: '#64748b' }}>"{order.deliveryInstructions}"</span>
                </div>
              )}
            </div>

            <div className="audit-summary-box" style={{ margin: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-color, #1e293b)' }}>
                💳 Payment &amp; Timing
              </div>
              <div className="audit-summary-row">
                <span>Payment Status:</span>
                <span className={`status-badge ${order.paymentStatus === 'VERIFIED' ? 'status-available' : order.paymentStatus === 'REJECTED' ? 'status-unavailable' : 'status-pending'}`}>
                  {order.paymentStatus}
                </span>
              </div>
              <div className="audit-summary-row">
                <span>Payment Reference:</span>
                <span>
                  {typeof order.paymentId === 'object' && order.paymentId?.paymentNumber
                    ? order.paymentId.paymentNumber
                    : order.paymentNumber || 'N/A'}
                </span>
              </div>
              <div className="audit-summary-row">
                <span>Dispatched At:</span>
                <span>{order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString() : 'Pending dispatch'}</span>
              </div>
              <div className="audit-summary-row">
                <span>Delivered At:</span>
                <span>{order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'Pending delivery'}</span>
              </div>
            </div>
          </div>

          {/* Itemized Order Snapshot Table */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              Itemized Order Snapshot ({(order.items || []).length} items)
            </h4>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
              <table className="admin-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <img
                            src={item.image || '/delicious-burger.jpg'}
                            alt={item.name}
                            style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                          <span style={{ fontWeight: 600 }}>{item.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>${(item.unitPrice ?? 0).toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>${(item.subtotal ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Authoritative Financial Breakdown */}
              <div style={{ background: 'var(--input-bg, #f9fafb)', padding: '0.75rem 1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '2rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Subtotal: <strong>${(order.subtotal ?? 0).toFixed(2)}</strong>
                </span>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Delivery Fee: <strong style={{ color: '#16a34a' }}>FREE ($0.00)</strong>
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#16a34a' }}>
                  Total: ${(order.totalAmount ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Status Change Audit Timeline */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="audit-timeline-section">
              <h4 className="audit-timeline-title">
                Status History Timeline ({order.statusHistory.length} events)
              </h4>
              <div className="audit-timeline-list">
                {order.statusHistory.map((event, idx) => (
                  <div key={idx} className="audit-timeline-item">
                    <div className="timeline-marker" />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-action-badge action-payment_verified">
                          {event.newStatus}
                        </span>
                        <span className="timeline-time">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="timeline-actor">
                        Updated by: <strong>{event.actorRole}</strong>
                      </div>
                      {event.note && (
                        <div className="timeline-note" style={{ fontStyle: 'italic', marginTop: '0.2rem' }}>
                          "{event.note}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
          <button type="button" className="btn-action btn-continue" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
