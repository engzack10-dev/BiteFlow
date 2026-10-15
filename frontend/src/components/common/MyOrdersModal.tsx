import { useState, useEffect } from 'react'
import type { OrderRecord } from '../../types/index.js'
import { api } from '../../api/client.js'

interface MyOrdersModalProps {
  isOpen: boolean
  onClose: () => void
  getToken: () => Promise<string | null>
}

export function MyOrdersModal({ isOpen, onClose, getToken }: MyOrdersModalProps) {
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRefresh = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await api.getMyOrders(getToken)
      setOrders(res.orders || [])
    } catch (err) {
      const e = err as Error
      setError(e.message || 'Failed to load your orders.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCancelled = false
    if (!isOpen) return

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
          setOrders(res.orders || [])
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          const e = err as Error
          setError(e.message || 'Failed to load your orders.')
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [isOpen, getToken])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-orders-modal-title"
    >
      <div
        className="modal-card my-orders-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '720px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close orders modal"
        >
          &#10005;
        </button>

        <div className="modal-header" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '1.5rem' }}>
            <div>
              <span className="checkout-step-badge">My Account</span>
              <h2 id="my-orders-modal-title" className="modal-title" style={{ marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                My Orders & Payment Status
              </h2>
              <p className="modal-subtitle" style={{ margin: 0, fontSize: '0.85rem' }}>
                Track your order lifecycle and payment verification status in real time.
              </p>
            </div>
            <button
              type="button"
              className="btn-action btn-continue"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', whiteSpace: 'nowrap' }}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', padding: '1rem 0' }}>
          {isLoading && orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
              Loading your orders...
            </div>
          ) : error ? (
            <div className="checkout-alert checkout-alert-error" style={{ margin: '1rem' }}>
              {error}
            </div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#374151' }}>
                No orders placed yet
              </p>
              <p style={{ fontSize: '0.875rem' }}>
                Your placed orders and payment statuses will be tracked here.
              </p>
            </div>
          ) : (
            <div className="orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orders.map((ord) => {
                const isPaymentVerified = ord.paymentStatus === 'VERIFIED'
                const isPaymentRejected = ord.paymentStatus === 'REJECTED'

                return (
                  <div
                    key={ord.id || ord._id || ord.orderNumber}
                    className="order-card-item"
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '1rem',
                      background: 'var(--card-bg, #ffffff)',
                    }}
                  >
                    {/* Header Row */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        borderBottom: '1px solid #f3f4f6',
                        paddingBottom: '0.75rem',
                        marginBottom: '0.75rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--text-color, #111827)' }}>
                            {ord.orderNumber}
                          </strong>
                          <span
                            className={`status-badge ${
                              ord.status === 'DELIVERED'
                                ? 'status-available'
                                : ord.status === 'CONFIRMED'
                                ? 'status-confirmed'
                                : ord.status === 'PREPARING'
                                ? 'status-preparing'
                                : ord.status === 'READY'
                                ? 'status-ready'
                                : ord.status === 'DISPATCHED'
                                ? 'status-dispatched'
                                : 'status-pending'
                            }`}
                            style={{ fontSize: '0.75rem' }}
                          >
                            Order: {ord.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>
                          Placed on: {new Date(ord.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#16a34a' }}>
                          ${ord.totalAmount.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {ord.items.reduce((s, i) => s + i.quantity, 0)} items
                        </div>
                      </div>
                    </div>

                    {/* FS-06 Payment Status Highlight Banner */}
                    <div
                      className={`payment-status-banner ${
                        isPaymentVerified
                          ? 'payment-status-banner-verified'
                          : isPaymentRejected
                          ? 'payment-status-banner-rejected'
                          : 'payment-status-banner-pending'
                      }`}
                      style={{
                        padding: '0.6rem 0.85rem',
                        borderRadius: '6px',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        background: isPaymentVerified
                          ? '#f0fdf4'
                          : isPaymentRejected
                          ? '#fef2f2'
                          : '#fffbeb',
                        border: `1px solid ${
                          isPaymentVerified
                            ? '#bbf7d0'
                            : isPaymentRejected
                            ? '#fecaca'
                            : '#fde68a'
                        }`,
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '1rem' }}>
                            {isPaymentVerified ? '✅' : isPaymentRejected ? '❌' : '⏳'}
                          </span>
                          <strong
                            style={{
                              fontSize: '0.85rem',
                              color: isPaymentVerified
                                ? '#15803d'
                                : isPaymentRejected
                                ? '#b91c1c'
                                : '#b45309',
                            }}
                          >
                            Payment Status: {ord.paymentStatus}
                          </strong>
                        </div>
                        <p
                          style={{
                            margin: '0.2rem 0 0 1.4rem',
                            fontSize: '0.8rem',
                            color: isPaymentVerified
                              ? '#166534'
                              : isPaymentRejected
                              ? '#991b1b'
                              : '#92400e',
                          }}
                        >
                          {isPaymentVerified
                            ? 'Payment has been verified by restaurant administration. Your order is confirmed!'
                            : isPaymentRejected
                            ? `Payment was rejected. ${
                                ord.paymentRejectionReason
                                  ? `Reason: ${ord.paymentRejectionReason}`
                                  : 'Please check your transaction details.'
                              }`
                            : 'Payment is awaiting Admin verification. Food preparation starts after verification.'}
                        </p>
                      </div>
                    </div>

                    {/* Order Items Preview */}
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#4b5563',
                        background: 'var(--input-bg, #f9fafb)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-color, #374151)' }}>
                        Items:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {ord.items.map((item, idx) => (
                          <div
                            key={idx}
                            style={{ display: 'flex', justifyContent: 'space-between' }}
                          >
                            <span>
                              {item.quantity} &times; {item.name}
                            </span>
                            <span style={{ fontWeight: 600 }}>${item.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery summary */}
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginTop: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>
                        📍 Deliver to: {ord.deliveryAddress}, {ord.deliveryArea} ({ord.customerPhone})
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb', textAlign: 'right' }}>
          <button type="button" className="btn-action btn-continue" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
