import { useState } from 'react'
import type { PaymentRecord } from '../../types/index.js'

interface RejectPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  payment: PaymentRecord | null
  onConfirmReject: (paymentId: string, reason: string) => Promise<void>
  isSubmitting: boolean
}

export function RejectPaymentModal({
  isOpen,
  onClose,
  payment,
  onConfirmReject,
  isSubmitting,
}: RejectPaymentModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !payment) return null

  const paymentId = payment._id || payment.id || ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed) {
      setError('A rejection reason is required to notify the customer')
      return
    }
    if (trimmed.length < 3) {
      setError('Rejection reason must be at least 3 characters')
      return
    }
    if (trimmed.length > 300) {
      setError('Rejection reason cannot exceed 300 characters')
      return
    }

    setError(null)
    await onConfirmReject(paymentId, trimmed)
  }

  return (
    <div
      className="modal-overlay"
      onClick={!isSubmitting ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close rejection modal"
        >
          &#10005;
        </button>

        <div className="modal-header">
          <span className="checkout-step-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            Payment Rejection
          </span>
          <h3 id="reject-modal-title" className="modal-title" style={{ color: '#dc2626' }}>
            Reject Payment {payment.paymentNumber}
          </h3>
          <p className="modal-subtitle">
            Order Reference: <strong>{payment.orderNumber}</strong> (${payment.amount.toFixed(2)})
          </p>
        </div>

        <div className="checkout-alert checkout-alert-error" style={{ marginBottom: '1rem' }}>
          ⚠️ <strong>Kitchen Safety Invariant:</strong> Rejecting this payment ensures the order will NOT be confirmed and will NOT enter kitchen preparation.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reject-reason">
              Rejection Reason <span className="required-star">*</span>
            </label>
            <textarea
              id="reject-reason"
              className={`form-textarea ${error ? 'input-error' : ''}`}
              rows={3}
              placeholder="e.g. Transaction ID was not found in bank ledger, insufficient amount transferred, or invalid payment reference."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError(null)
              }}
              maxLength={300}
              disabled={isSubmitting}
              required
            />
            {error && <span className="field-error-msg">{error}</span>}
            <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>
              {reason.length}/300 characters. This reason will be logged in the audit trail.
            </span>
          </div>

          <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              className="btn-action btn-continue"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-action"
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                borderRadius: '8px',
                padding: '0.65rem 1.25rem',
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
