import { useState, useEffect, useCallback } from 'react'
import type { OrderRecord, OrderStatus } from '../../types/index.js'
import { PaymentsIcon, AlertTriangleIcon, CheckCircleIcon } from '../common/AdminIcons.js'

interface AdminOrderDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  order: OrderRecord | null
  onUpdateStatus: (orderId: string, nextStatus: OrderStatus, note?: string) => Promise<void>
}

export function AdminOrderDetailsModal({
  isOpen,
  onClose,
  order,
  onUpdateStatus,
}: AdminOrderDetailsModalProps) {
  const [transitionNote, setTransitionNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = useCallback(() => {
    if (isSubmitting) return
    setTransitionNote('')
    setError(null)
    onClose()
  }, [isSubmitting, onClose])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, handleClose])

  if (!isOpen || !order) return null

  const orderId = order.id || order._id || order.orderNumber

  // Determine allowed next status based on FS-07 state machine
  let nextStatusOption: {
    status: OrderStatus
    label: string
    description: string
    buttonClass: string
  } | null = null

  if (order.status === 'CONFIRMED') {
    nextStatusOption = {
      status: 'PREPARING',
      label: 'Start Kitchen Preparation',
      description: 'Move order into the kitchen preparation queue.',
      buttonClass: 'btn-prep-action',
    }
  } else if (order.status === 'PREPARING') {
    nextStatusOption = {
      status: 'READY',
      label: 'Mark Ready for Delivery',
      description: 'Kitchen has finished cooking. Food is packed and awaiting courier pickup.',
      buttonClass: 'btn-ready-action',
    }
  } else if (order.status === 'READY') {
    nextStatusOption = {
      status: 'DISPATCHED',
      label: 'Dispatch for Delivery',
      description: 'Hand food order over to the delivery courier.',
      buttonClass: 'btn-dispatch-action',
    }
  } else if (order.status === 'DISPATCHED') {
    nextStatusOption = {
      status: 'DELIVERED',
      label: 'Mark Order as Delivered',
      description: 'Courier has successfully handed food to the customer.',
      buttonClass: 'btn-deliver-action',
    }
  }

  const handleExecuteTransition = async (nextStatus: OrderStatus) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await onUpdateStatus(orderId, nextStatus, transitionNote.trim() || undefined)
      setTransitionNote('')
    } catch (err) {
      const e = err as Error
      setError(e.message || 'Failed to update order status')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isPaymentVerified = order.paymentStatus === 'VERIFIED'
  const isPaymentRejected = order.paymentStatus === 'REJECTED'

  return (
    <div
      className="modal-overlay"
      onClick={!isSubmitting ? handleClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-details-title"
    >
      <div
        className="modal-card admin-order-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <button
          className="modal-close-btn"
          onClick={handleClose}
          aria-label="Close modal"
          disabled={isSubmitting}
        >
          &#10005;
        </button>

        {/* Modal Header */}
        <div className="modal-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', paddingRight: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span className="checkout-step-badge">Order Inspection</span>
              <h2 id="order-details-title" className="modal-title" style={{ marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                Order #{order.orderNumber}
              </h2>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Placed: {new Date(order.createdAt).toLocaleString()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span
                className={`status-badge ${
                  isPaymentVerified
                    ? 'status-available'
                    : isPaymentRejected
                    ? 'status-unavailable'
                    : 'status-pending'
                }`}
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
              >
                Status: {order.status}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ overflowY: 'auto', padding: '1.25rem 0' }}>
          {error && (
            <div className="checkout-alert checkout-alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          {/* Quick Order Advance Box */}
          <div
            className="order-transition-control-box"
            style={{
              background: 'var(--input-bg, #f8fafc)',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-color, #1e293b)' }}>
                Lifecycle Transition Control (FS-07):
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Current: <strong>{order.status}</strong>
              </span>
            </div>

            {nextStatusOption ? (
              <div>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 0.75rem' }}>
                  {nextStatusOption.description}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="checkout-form-input"
                    placeholder="Optional transition note / staff assignment..."
                    value={transitionNote}
                    onChange={(e) => setTransitionNote(e.target.value)}
                    style={{ flex: '1 1 240px', fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className={`btn-action ${nextStatusOption.buttonClass}`}
                    onClick={() => handleExecuteTransition(nextStatusOption!.status)}
                    disabled={isSubmitting}
                    style={{ whiteSpace: 'nowrap', padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                  >
                    {isSubmitting ? 'Updating...' : nextStatusOption.label}
                  </button>
                </div>
              </div>
            ) : order.status === 'PENDING_PAYMENT' ? (
              <div style={{ fontSize: '0.85rem', color: '#b45309', background: '#fffbeb', padding: '0.65rem', borderRadius: '6px', border: '1px solid #fde68a', display: 'flex', alignItems: 'flex-start', gap: '0.45rem' }}>
                <AlertTriangleIcon size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Awaiting Manual Payment Verification:</strong> Food preparation cannot start while payment is pending. Please verify the customer payment in the Payment Verification tab first.
                </span>
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#166534', background: '#f0fdf4', padding: '0.65rem', borderRadius: '6px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <CheckCircleIcon size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Order Delivered:</strong> This order has reached the terminal status of the delivery lifecycle.
                </span>
              </div>
            )}
          </div>

          {/* Delivery & Customer Info Card */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="audit-summary-box" style={{ margin: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: '#1e293b' }}>
                📍 Delivery Destination
              </div>
              <div className="audit-summary-row">
                <span>Recipient:</span>
                <strong>{order.customerName}</strong>
              </div>
              <div className="audit-summary-row">
                <span>Phone:</span>
                <span>{order.customerPhone}</span>
              </div>
              <div className="audit-summary-row">
                <span>Street Address:</span>
                <span>{order.deliveryAddress}</span>
              </div>
              <div className="audit-summary-row">
                <span>Area/District:</span>
                <span>{order.deliveryArea}</span>
              </div>
              {order.deliveryInstructions && (
                <div className="audit-summary-row">
                  <span>Instructions:</span>
                  <span style={{ fontStyle: 'italic', color: '#475569' }}>"{order.deliveryInstructions}"</span>
                </div>
              )}
            </div>

            <div className="audit-summary-box" style={{ margin: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <PaymentsIcon size={16} />
                <span>Payment Information</span>
              </div>
              <div className="audit-summary-row">
                <span>Payment Status:</span>
                <span className={`status-badge ${isPaymentVerified ? 'status-available' : isPaymentRejected ? 'status-unavailable' : 'status-pending'}`}>
                  {order.paymentStatus}
                </span>
              </div>
              <div className="audit-summary-row">
                <span>Authoritative Amount:</span>
                <strong style={{ color: '#16a34a' }}>${order.totalAmount.toFixed(2)}</strong>
              </div>
              <div className="audit-summary-row">
                <span>Dispatched Time:</span>
                <span>{order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString() : 'Not dispatched yet'}</span>
              </div>
              <div className="audit-summary-row">
                <span>Delivered Time:</span>
                <span>{order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'Not delivered yet'}</span>
              </div>
              {isPaymentRejected && order.paymentRejectionReason && (
                <div className="audit-summary-row">
                  <span style={{ color: '#dc2626' }}>Rejection Reason:</span>
                  <span style={{ color: '#dc2626' }}>{order.paymentRejectionReason}</span>
                </div>
              )}
            </div>
          </div>

          {/* Itemized Order Items Snapshot */}
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
              <div style={{ background: '#f9fafb', padding: '0.75rem 1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '2rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Subtotal: <strong>${(order.subtotal ?? 0).toFixed(2)}</strong>
                </span>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Delivery Fee: <strong style={{ color: '#16a34a' }}>FREE ($0.00)</strong>
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a' }}>
                  Total: ${(order.totalAmount ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Status Change Audit History */}
          <div className="audit-timeline-section">
            <h4 className="audit-timeline-title">
              Order Lifecycle History ({order.statusHistory?.length || 0} events)
            </h4>
            <div className="audit-timeline-list">
              {(!order.statusHistory || order.statusHistory.length === 0) ? (
                <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>No status transitions recorded yet.</p>
              ) : (
                order.statusHistory.map((event, idx) => (
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
                        Actor: <strong>{event.actorRole.toUpperCase()}</strong> ({event.actorEmail || event.actorId})
                      </div>
                      <div className="timeline-transition">
                        Transition: {event.previousStatus || 'INIT'} &rarr; <strong>{event.newStatus}</strong>
                      </div>
                      {event.note && (
                        <div className="timeline-note">
                          <em>"{event.note}"</em>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
          <button
            type="button"
            className="btn-action btn-continue"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
