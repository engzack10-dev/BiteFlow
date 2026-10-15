import { useState, useMemo } from 'react'
import type { FeedbackRecord } from '../../types/index.js'
import { FeedbackIcon, PhoneIcon, SearchIcon } from '../common/AdminIcons.js'

interface AdminFeedbackTableProps {
  feedback: FeedbackRecord[]
  isLoading: boolean
  onUpdateStatus: (id: string, status: 'PENDING' | 'REVIEWED' | 'ARCHIVED') => Promise<void>
  onRefresh: (status?: string, search?: string) => void
}

export function AdminFeedbackTable({
  feedback,
  isLoading,
  onUpdateStatus,
  onRefresh,
}: AdminFeedbackTableProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'REVIEWED' | 'ARCHIVED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<FeedbackRecord | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const handleFilterChange = (newStatus: 'ALL' | 'PENDING' | 'REVIEWED' | 'ARCHIVED') => {
    setStatusFilter(newStatus)
    onRefresh(newStatus, searchQuery)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onRefresh(statusFilter, searchQuery)
  }

  const handleStatusChange = async (id: string, nextStatus: 'PENDING' | 'REVIEWED' | 'ARCHIVED') => {
    setIsUpdating(true)
    setUpdateError(null)
    try {
      await onUpdateStatus(id, nextStatus)
      if (selectedItem && selectedItem._id === id) {
        setSelectedItem({ ...selectedItem, status: nextStatus })
      }
    } catch (err) {
      const e = err as Error
      setUpdateError(e.message || 'Failed to update feedback status')
    } finally {
      setIsUpdating(false)
    }
  }

  const formatDate = (iso?: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="payment-badge payment-pending">Pending Review</span>
      case 'REVIEWED':
        return <span className="payment-badge payment-verified">Reviewed</span>
      case 'ARCHIVED':
        return <span className="status-badge" style={{ background: '#e5e7eb', color: '#6b7280' }}>Archived</span>
      default:
        return <span className="status-badge">{status}</span>
    }
  }

  // Filter feedback by status and search query
  const filteredFeedback = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return feedback.filter((item) => {
      const matchesStatus =
        statusFilter === 'ALL' || item.status === statusFilter
      if (!matchesStatus) return false

      if (!q) return true

      const nameMatch = (item.name || '').toLowerCase().includes(q)
      const emailMatch = (item.email || '').toLowerCase().includes(q)
      const phoneMatch = (item.phone || '').toLowerCase().includes(q)
      const subjectMatch = (item.subject || '').toLowerCase().includes(q)
      const messageMatch = (item.message || '').toLowerCase().includes(q)

      return nameMatch || emailMatch || phoneMatch || subjectMatch || messageMatch
    })
  }, [feedback, statusFilter, searchQuery])

  // Count summaries
  const pendingCount = useMemo(() => feedback.filter((f) => f.status === 'PENDING').length, [feedback])
  const reviewedCount = useMemo(() => feedback.filter((f) => f.status === 'REVIEWED').length, [feedback])
  const archivedCount = useMemo(() => feedback.filter((f) => f.status === 'ARCHIVED').length, [feedback])

  return (
    <div className="admin-feedback-view">
      <div className="admin-section-header">
        <div>
          <h2 className="admin-section-heading">Customer Inquiries & Feedback</h2>
          <p className="admin-section-sub">
            Review customer contact submissions, feedback, and special catering requests.
          </p>
        </div>

        <button
          type="button"
          className="btn-refresh-orders"
          onClick={() => onRefresh(statusFilter, searchQuery)}
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : '↻ Refresh Inquiries'}
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Status Filter Tabs */}
        <div className="orders-filter-bar" style={{ margin: 0 }}>
          <button
            type="button"
            className={`filter-pill-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => handleFilterChange('ALL')}
          >
            All Messages ({feedback.length})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${statusFilter === 'PENDING' ? 'active' : ''}`}
            onClick={() => handleFilterChange('PENDING')}
          >
            Pending Review ({pendingCount})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${statusFilter === 'REVIEWED' ? 'active' : ''}`}
            onClick={() => handleFilterChange('REVIEWED')}
          >
            Reviewed ({reviewedCount})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${statusFilter === 'ARCHIVED' ? 'active' : ''}`}
            onClick={() => handleFilterChange('ARCHIVED')}
          >
            Archived ({archivedCount})
          </button>
        </div>

        {/* Live Search Form */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', maxWidth: '380px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <SearchIcon size={15} />
            </span>
            <input
              type="text"
              className="input-text"
              placeholder="Search name, email, subject, text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: '32px',
                paddingRight: searchQuery ? '32px' : '10px',
                fontSize: '0.875rem',
                height: '38px',
                borderRadius: '8px',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </form>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
          Loading customer feedback...
        </div>
      ) : filteredFeedback.length === 0 ? (
        <div className="customer-orders-empty" style={{ margin: '2rem 0' }}>
          <div className="empty-orders-icon">
            <FeedbackIcon size={36} />
          </div>
          <h3 className="empty-orders-title">
            {searchQuery ? 'No Matching Inquiries Found' : 'No Inquiries in this Category'}
          </h3>
          <p className="empty-orders-desc">
            {searchQuery
              ? `No messages match "${searchQuery}". Try a different search term or clear the filter.`
              : 'Customer inquiries and questions sent through the Contact section will be recorded here.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              className="btn-action btn-continue"
              style={{ marginTop: '0.75rem' }}
              onClick={() => setSearchQuery('')}
            >
              Clear Search Query
            </button>
          )}
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Subject</th>
                <th>Message Preview</th>
                <th>Status</th>
                <th>Date Received</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeedback.map((item) => (
                <tr key={item._id} className={item.status === 'PENDING' ? 'row-pending-highlight' : ''}>
                  <td>
                    <strong>{item.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{item.email}</div>
                    {item.phone && (
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                        <PhoneIcon size={11} style={{ opacity: 0.65 }} />
                        <span>{item.phone}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{item.subject}</span>
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    <div
                      style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontSize: '0.85rem',
                        color: 'var(--text-muted, #4b5563)',
                      }}
                    >
                      {item.message}
                    </div>
                  </td>
                  <td>{getStatusBadge(item.status)}</td>
                  <td style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {formatDate(item.createdAt)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn-action btn-inspect"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => setSelectedItem(item)}
                      >
                        Read
                      </button>

                      {item.status === 'PENDING' && (
                        <button
                          type="button"
                          className="btn-action btn-checkout"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', background: '#059669', borderColor: '#059669' }}
                          onClick={() => handleStatusChange(item._id, 'REVIEWED')}
                          disabled={isUpdating}
                        >
                          Mark Reviewed
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Message Inspection Modal */}
      {selectedItem && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-card"
            style={{ maxWidth: '640px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-btn"
              onClick={() => setSelectedItem(null)}
              aria-label="Close modal"
            >
              &#10005;
            </button>

            <div className="modal-header">
              <span className="checkout-step-badge">Inquiry Details</span>
              <h3 className="modal-title">{selectedItem.subject}</h3>
              <p className="modal-subtitle">
                From: <strong>{selectedItem.name}</strong> ({selectedItem.email}) &bull; Received: {formatDate(selectedItem.createdAt)}
              </p>
            </div>

            {updateError && (
              <div className="checkout-alert checkout-alert-error" style={{ marginBottom: '1rem' }}>
                ⚠️ {updateError}
              </div>
            )}

            {selectedItem.phone && (
              <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
                Contact Phone: <strong>{selectedItem.phone}</strong>
              </div>
            )}

            {/* Message Body Box */}
            <div
              style={{
                background: 'var(--bg-page)',
                padding: '1.25rem',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '0.95rem',
                lineHeight: 1.6,
                color: 'var(--text-dark)',
                margin: '1rem 0',
                whiteSpace: 'pre-wrap',
                maxHeight: '350px',
                overflowY: 'auto',
              }}
            >
              {selectedItem.message}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                Status: {getStatusBadge(selectedItem.status)}
                {selectedItem.reviewedBy && (
                  <span style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                    by {selectedItem.reviewedBy} on {formatDate(selectedItem.reviewedAt)}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedItem.status !== 'REVIEWED' && (
                  <button
                    type="button"
                    className="btn-action btn-checkout"
                    style={{ background: '#059669', borderColor: '#059669' }}
                    onClick={() => handleStatusChange(selectedItem._id, 'REVIEWED')}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Updating...' : 'Mark as Reviewed'}
                  </button>
                )}
                {selectedItem.status !== 'ARCHIVED' && (
                  <button
                    type="button"
                    className="btn-action btn-back-cart"
                    onClick={() => handleStatusChange(selectedItem._id, 'ARCHIVED')}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Updating...' : 'Archive'}
                  </button>
                )}
                {selectedItem.status !== 'PENDING' && (
                  <button
                    type="button"
                    className="btn-action btn-inspect"
                    onClick={() => handleStatusChange(selectedItem._id, 'PENDING')}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Updating...' : 'Reopen as Pending'}
                  </button>
                )}
                <button
                  type="button"
                  className="btn-action btn-continue"
                  onClick={() => setSelectedItem(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

