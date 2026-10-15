import type { PaymentRecord } from '../../types/index.js'

interface PaymentAuditModalProps {
  isOpen: boolean
  onClose: () => void
  payment: PaymentRecord | null
}

export function PaymentAuditModal({
  isOpen,
  onClose,
  payment,
}: PaymentAuditModalProps) {
  if (!isOpen || !payment) return null

  const orderObj = typeof payment.orderId === 'object' && payment.orderId !== null ? payment.orderId : null

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div
        className="modal-card payment-audit-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close audit modal"
        >
          &#10005;
        </button>

        <div className="modal-header">
          <span className="checkout-step-badge">Audit Trail</span>
          <h3 id="audit-modal-title" className="modal-title">
            Payment {payment.paymentNumber}
          </h3>
          <p className="modal-subtitle">
            Order Reference: <strong>{payment.orderNumber}</strong> · Amount:{' '}
            <strong style={{ color: '#16a34a' }}>${payment.amount.toFixed(2)}</strong>
          </p>
        </div>

        {/* Status Snapshot Card */}
        <div className="audit-summary-box">
          <div className="audit-summary-row">
            <span>Customer:</span>
            <strong>
              {payment.customerName} {payment.customerEmail ? `(${payment.customerEmail})` : ''}
            </strong>
          </div>
          <div className="audit-summary-row">
            <span>Current Status:</span>
            <span
              className={`status-badge ${
                payment.status === 'VERIFIED'
                  ? 'status-available'
                  : payment.status === 'REJECTED'
                  ? 'status-unavailable'
                  : 'status-pending'
              }`}
            >
              {payment.status}
            </span>
          </div>
          <div className="audit-summary-row">
            <span>Payment Method:</span>
            <span>{payment.paymentMethod || 'MANUAL_VERIFICATION'}</span>
          </div>

          {payment.status === 'VERIFIED' && (
            <div className="audit-verified-banner">
              ✓ Verified by <strong>{payment.verifiedBy || 'Admin'}</strong> on{' '}
              {payment.verifiedAt ? new Date(payment.verifiedAt).toLocaleString() : 'N/A'}
            </div>
          )}

          {payment.status === 'REJECTED' && (
            <div className="audit-rejection-banner">
              <strong>Rejection Reason:</strong> {payment.rejectionReason || 'No specific reason provided'}
              <div style={{ fontSize: '0.8rem', marginTop: '0.3rem', color: '#7f1d1d' }}>
                Rejected by {payment.rejectedBy || 'Admin'} on{' '}
                {payment.rejectedAt ? new Date(payment.rejectedAt).toLocaleString() : 'N/A'}
              </div>
            </div>
          )}

          {orderObj && orderObj.items && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>Order Items:</span>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
                {orderObj.items.map((i, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                    <span>{i.quantity} × {i.name}</span>
                    <span>${i.subtotal.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Audit History Timeline */}
        <div className="audit-timeline-section">
          <h4 className="audit-timeline-title">Event History & Decisions ({payment.auditHistory?.length || 0})</h4>
          <div className="audit-timeline-list">
            {(!payment.auditHistory || payment.auditHistory.length === 0) ? (
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No audit events recorded.</p>
            ) : (
              payment.auditHistory.map((event, idx) => (
                <div key={idx} className="audit-timeline-item">
                  <div className="timeline-marker" />
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className={`timeline-action-badge action-${event.action.toLowerCase()}`}>
                        {event.action}
                      </span>
                      <span className="timeline-time">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="timeline-actor">
                      Actor: <strong>{event.actorRole.toUpperCase()}</strong> ({event.actorEmail || event.actorId})
                    </div>
                    <div className="timeline-transition">
                      Status:{' '}
                      <span style={{ textDecoration: event.previousStatus ? 'line-through' : 'none' }}>
                        {event.previousStatus || 'INIT'}
                      </span>{' '}
                      → <strong>{event.newStatus}</strong>
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

        <div className="modal-actions" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-action btn-continue" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
