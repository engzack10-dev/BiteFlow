import { useState } from 'react'
import type { OrderRecord, OrderStatus, AdminOrdersResponse } from '../../types/index.js'
import {
  ClipboardListIcon,
  ShieldCheckIcon,
  ChefHatIcon,
  BellIcon,
  DeliveryIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
} from '../common/AdminIcons.js'

interface AdminOrdersTableProps {
  orders: OrderRecord[]
  counts?: AdminOrdersResponse['counts']
  isLoading: boolean
  onUpdateStatus?: (orderId: string, nextStatus: OrderStatus, note?: string) => Promise<void>
  onInspectOrder: (order: OrderRecord) => void
  onRefresh: (filters?: { status?: string; startDate?: string; endDate?: string; search?: string }) => void
}

export function AdminOrdersTable({
  orders,
  counts,
  isLoading,
  onInspectOrder,
  onRefresh,
}: AdminOrdersTableProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [dateError, setDateError] = useState<string | null>(null)

  const handleApplyFilters = () => {
    setDateError(null)
    if (startDate && endDate && endDate < startDate) {
      setDateError('End date cannot be earlier than start date')
      return
    }
    onRefresh({
      status: selectedStatus,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: searchQuery.trim() || undefined,
    })
  }

  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setSearchQuery('')
    setSelectedStatus('ALL')
    setDateError(null)
    onRefresh({
      status: 'ALL',
    })
  }

  const handleSelectStatusTab = (statusTab: string) => {
    setSelectedStatus(statusTab)
    onRefresh({
      status: statusTab,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: searchQuery.trim() || undefined,
    })
  }

  return (
    <div className="admin-orders-section">
      {/* Informational Guidance Banner */}
      <div className="checkout-alert checkout-alert-warning" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <strong>Operational Kitchen & Delivery Management (FS-07):</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              Kitchen preparation begins only for <strong>CONFIRMED</strong> orders with verified payments. Advance orders through <em>PREPARING &rarr; READY &rarr; DISPATCHED &rarr; DELIVERED</em>.
            </p>
          </div>
          <button
            type="button"
            className="btn-action btn-continue"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            onClick={() => onRefresh({ status: selectedStatus, startDate, endDate, search: searchQuery })}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : '🔄 Refresh Orders'}
          </button>
        </div>
      </div>

      {/* Date Range & Search Filter Bar */}
      <div className="orders-filter-bar" style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>
              Search Orders:
            </label>
            <input
              type="text"
              className="checkout-form-input"
              placeholder="Order #, Customer, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            />
          </div>

          <div style={{ flex: '0 1 150px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>
              From Date:
            </label>
            <input
              type="date"
              className="checkout-form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            />
          </div>

          <div style={{ flex: '0 1 150px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.25rem' }}>
              To Date:
            </label>
            <input
              type="date"
              className="checkout-form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-action btn-checkout"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
              onClick={handleApplyFilters}
              disabled={isLoading}
            >
              Filter
            </button>
            <button
              type="button"
              className="btn-action btn-continue"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              onClick={handleClearFilters}
              disabled={isLoading}
            >
              Clear
            </button>
          </div>
        </div>

        {dateError && (
          <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertTriangleIcon size={14} />
            <span>{dateError}</span>
          </div>
        )}
      </div>

      {/* Status Sub-Filter Tabs */}
      <div className="admin-subfilter-tabs">
        <button
          type="button"
          className={`subfilter-btn ${selectedStatus === 'ALL' ? 'active' : ''}`}
          onClick={() => handleSelectStatusTab('ALL')}
        >
          <ClipboardListIcon size={14} />
          <span>All Orders ({counts?.total ?? orders.length})</span>
        </button>
        <button
          type="button"
          className={`subfilter-btn ${selectedStatus === 'CONFIRMED' ? 'active' : ''}`}
          onClick={() => handleSelectStatusTab('CONFIRMED')}
        >
          <ShieldCheckIcon size={14} />
          <span>Confirmed ({counts?.confirmed ?? orders.filter((o) => o.status === 'CONFIRMED').length})</span>
        </button>
        <button
          type="button"
          className={`subfilter-btn ${selectedStatus === 'PREPARING' ? 'active' : ''}`}
          onClick={() => handleSelectStatusTab('PREPARING')}
        >
          <ChefHatIcon size={14} />
          <span>In Kitchen ({counts?.preparing ?? orders.filter((o) => o.status === 'PREPARING').length})</span>
        </button>
        <button
          type="button"
          className={`subfilter-btn ${selectedStatus === 'READY' ? 'active' : ''}`}
          onClick={() => handleSelectStatusTab('READY')}
        >
          <BellIcon size={14} />
          <span>Ready ({counts?.ready ?? orders.filter((o) => o.status === 'READY').length})</span>
        </button>
        <button
          type="button"
          className={`subfilter-btn ${selectedStatus === 'DISPATCHED' ? 'active' : ''}`}
          onClick={() => handleSelectStatusTab('DISPATCHED')}
        >
          <DeliveryIcon size={14} />
          <span>Out for Delivery ({counts?.dispatched ?? orders.filter((o) => o.status === 'DISPATCHED').length})</span>
        </button>
        <button
          type="button"
          className={`subfilter-btn ${selectedStatus === 'DELIVERED' ? 'active' : ''}`}
          onClick={() => handleSelectStatusTab('DELIVERED')}
        >
          <CheckCircleIcon size={14} />
          <span>Delivered ({counts?.delivered ?? orders.filter((o) => o.status === 'DELIVERED').length})</span>
        </button>
        <button
          type="button"
          className={`subfilter-btn ${selectedStatus === 'PENDING_PAYMENT' ? 'active' : ''}`}
          onClick={() => handleSelectStatusTab('PENDING_PAYMENT')}
        >
          <ClockIcon size={14} />
          <span>Pending Payment ({counts?.pendingPayment ?? orders.filter((o) => o.status === 'PENDING_PAYMENT').length})</span>
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-payments-box">
          <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#374151', margin: '0 0 0.5rem' }}>
            No orders found matching the selected criteria.
          </p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            Try adjusting your date range, search query, or status filter.
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '160px', minWidth: '160px' }}>Order Ref</th>
                <th style={{ minWidth: '180px' }}>Customer</th>
                <th style={{ width: '170px', minWidth: '170px' }}>Time Placed</th>
                <th style={{ width: '150px', minWidth: '150px' }}>Items Total ($)</th>
                <th style={{ width: '120px', minWidth: '120px' }}>Payment</th>
                <th style={{ width: '170px', minWidth: '170px' }}>Order Status</th>
                <th style={{ width: '110px', minWidth: '110px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => {
                const orderId = ord.id || ord._id || ord.orderNumber
                const totalItemCount = (ord.items || []).reduce((s, i) => s + (i.quantity || 0), 0)

                return (
                  <tr key={orderId}>
                    <td>
                      <span className="payment-ref-code table-order-ref">{ord.orderNumber}</span>
                    </td>
                    <td>
                      <div className="table-customer-name">
                        {ord.customerName}
                      </div>
                      <div className="table-customer-phone">
                        {ord.customerPhone}
                      </div>
                    </td>
                    <td className="table-timestamp">
                      {ord.createdAt ? new Date(ord.createdAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="table-amount-cell">
                      <span className="table-items-count">
                        {totalItemCount} items{' '}
                      </span>
                      <strong className="table-amount">
                        ${(ord.totalAmount ?? 0).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      {ord.paymentStatus === 'PENDING' ? (
                        <span className="order-pending-pill">
                          PENDING
                        </span>
                      ) : (
                        <span className="order-plain-status">
                          {ord.paymentStatus}
                        </span>
                      )}
                    </td>
                    <td>
                      {ord.status === 'PENDING_PAYMENT' ? (
                        <span className="order-pending-pill">
                          PENDING_PAYMENT
                        </span>
                      ) : (
                        <span className="order-plain-status">
                          {ord.status}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', width: '110px', minWidth: '110px' }}>
                      <button
                        type="button"
                        className="btn-table-action btn-details-action"
                        onClick={() => onInspectOrder(ord)}
                        title="Inspect complete order details and history"
                      >
                        Details
                      </button>
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
