import { useState } from 'react'
import type { PaymentRecord, PaymentStatus } from '../../types/index.js'

interface AdminPaymentsTableProps {
  payments: PaymentRecord[]
  isLoading: boolean
  onVerifyPayment: (payment: PaymentRecord) => void
  onRejectPayment: (payment: PaymentRecord) => void
  onViewAudit: (payment: PaymentRecord) => void
  onRefresh: () => void
}

export function AdminPaymentsTable({
  payments,
  isLoading,
  onVerifyPayment,
  onRejectPayment,
  onViewAudit,
  onRefresh,
}: AdminPaymentsTableProps) {
  const [filter, setFilter] = useState<'ALL' | PaymentStatus>('PENDING')

  const filteredPayments = payments.filter((p) => {
    if (filter === 'ALL') return true
    return p.status === filter
  })

  const pendingCount = payments.filter((p) => p.status === 'PENDING').length
  const verifiedCount = payments.filter((p) => p.status === 'VERIFIED').length
  const rejectedCount = payments.filter((p) => p.status === 'REJECTED').length

  return (
    <div className="admin-payments-section">
      {/* Informational Guidance Banner */}
      <div className="checkout-alert checkout-alert-warning" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Manual Payment Verification Queue (FS-06):</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              Check actual merchant account or bank transaction alerts before verifying. Only verified payments authorize orders to transition to <strong>CONFIRMED</strong> and become eligible for kitchen preparation.
            </p>
          </div>
          <button
            type="button"
            className="btn-action btn-continue"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap', marginLeft: '1rem' }}
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : '🔄 Refresh Queue'}
          </button>
        </div>
      </div>

      {/* Sub-Filter Tabs */}
      <div className="admin-subfilter-tabs">
        <button
          type="button"
          className={`subfilter-btn ${filter === 'PENDING' ? 'active' : ''}`}
          onClick={() => setFilter('PENDING')}
        >
          Pending Verification ({pendingCount})
        </button>
        <button
          type="button"
          className={`subfilter-btn ${filter === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilter('ALL')}
        >
          All Records ({payments.length})
        </button>
        <button
          type="button"
          className={`subfilter-btn ${filter === 'VERIFIED' ? 'active' : ''}`}
          onClick={() => setFilter('VERIFIED')}
        >
          Verified ({verifiedCount})
        </button>
        <button
          type="button"
          className={`subfilter-btn ${filter === 'REJECTED' ? 'active' : ''}`}
          onClick={() => setFilter('REJECTED')}
        >
          Rejected ({rejectedCount})
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
          Loading payments queue...
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="empty-payments-box">
          <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#374151', margin: '0 0 0.5rem' }}>
            No {filter !== 'ALL' ? filter.toLowerCase() : ''} payments found.
          </p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            {filter === 'PENDING'
              ? 'Great job! All customer orders have been verified or addressed.'
              : 'Payments will appear here once submitted by customers.'}
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Payment Ref</th>
                <th>Order Ref</th>
                <th>Customer</th>
                <th>Amount ($)</th>
                <th>Payment Status</th>
                <th>Submitted</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => {
                const isPending = p.status === 'PENDING'
                const isVerified = p.status === 'VERIFIED'
                const isRejected = p.status === 'REJECTED'

                return (
                  <tr key={p._id || p.paymentNumber}>
                    <td>
                      <span className="payment-ref-code">{p.paymentNumber}</span>
                    </td>
                    <td>
                      <strong>{p.orderNumber}</strong>
                    </td>
                    <td>
                      <div>{p.customerName}</div>
                      {p.customerEmail && (
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {p.customerEmail}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a' }}>
                        ${p.amount.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          isVerified
                            ? 'status-available'
                            : isRejected
                            ? 'status-unavailable'
                            : 'status-pending'
                        }`}
                      >
                        {p.status}
                      </span>
                      {isRejected && p.rejectionReason && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: '#b91c1c',
                            marginTop: '0.2rem',
                            maxWidth: '180px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={p.rejectionReason}
                        >
                          Reason: {p.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {p.submittedAt ? new Date(p.submittedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="payment-actions-stack">
                        {isPending ? (
                          <>
                            <div className="payment-actions-top-row">
                              <button
                                type="button"
                                className="btn-table-action btn-verify-action"
                                title="Verify this payment receipt"
                                onClick={() => onVerifyPayment(p)}
                              >
                                ✓ Verify
                              </button>
                              <button
                                type="button"
                                className="btn-table-action btn-reject-action"
                                title="Reject this payment"
                                onClick={() => onRejectPayment(p)}
                              >
                                ✕ Reject
                              </button>
                            </div>
                            <button
                              type="button"
                              className="btn-table-action btn-details-action btn-audit-full"
                              title="View complete audit trail & details"
                              onClick={() => onViewAudit(p)}
                            >
                              Audit Details
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn-table-action btn-details-action"
                            title="View complete audit trail & details"
                            onClick={() => onViewAudit(p)}
                          >
                            Audit Details
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
