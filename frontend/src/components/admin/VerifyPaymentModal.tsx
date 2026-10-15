import type { PaymentRecord } from '../../types/index.js'

interface VerifyPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  payment: PaymentRecord | null
  onConfirmVerify: (paymentId: string) => Promise<void>
  isSubmitting: boolean
}

export function VerifyPaymentModal({
  isOpen,
  onClose,
  payment,
  onConfirmVerify,
  isSubmitting,
}: VerifyPaymentModalProps) {
  if (!isOpen || !payment) return null

  const paymentId = payment._id || payment.id || ''

  const handleConfirm = async () => {
    await onConfirmVerify(paymentId)
  }

  return (
    <div
      className="modal-overlay"
      onClick={!isSubmitting ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-modal-title"
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close verification modal"
        >
          &#10005;
        </button>

        <div className="modal-header">
          <span className="checkout-step-badge" style={{ background: '#dcfce7', color: '#16a34a' }}>
            Verification Required
          </span>
          <h3 id="verify-modal-title" className="modal-title">
            Verify Payment Receipt
          </h3>
          <p className="modal-subtitle">
            Order Reference: <strong>{payment.orderNumber}</strong> ({payment.paymentNumber})
          </p>
        </div>

        <div className="checkout-alert checkout-alert-warning" style={{ marginBottom: '1.25rem' }}>
          <strong>⚠️ Admin Verification Checklist:</strong>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem' }}>
            Client-side claims never prove payment. Confirm that you have checked the actual money transfer notification or bank account for receipt of <strong>${payment.amount.toFixed(2)}</strong>.
          </p>
        </div>

        <div className="audit-summary-box" style={{ marginBottom: '1.25rem' }}>
          <div className="audit-summary-row">
            <span>Customer:</span>
            <strong>{payment.customerName}</strong>
          </div>
          <div className="audit-summary-row">
            <span>Amount to Confirm:</span>
            <span style={{ fontSize: '1.15rem', color: '#16a34a', fontWeight: 700 }}>
              ${payment.amount.toFixed(2)}
            </span>
          </div>
          <div className="audit-summary-row">
            <span>Payment Method:</span>
            <span>{payment.paymentMethod || 'MANUAL_VERIFICATION'}</span>
          </div>
          <div className="audit-summary-row">
            <span>Order Lifecycle:</span>
            <span>PENDING_PAYMENT → <strong>CONFIRMED (Kitchen Eligible)</strong></span>
          </div>
        </div>

        <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn-action btn-continue"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-action"
            style={{
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              padding: '0.65rem 1.25rem',
            }}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Verifying...' : '✓ Confirm & Authorize Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
