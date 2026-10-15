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
  onUpdateStatus: (orderId: string, nextStatus: OrderStatus, note?: string) => Promise<void>
  onInspectOrder: (order: OrderRecord) => void
  onRefresh: (filters?: { status?: string; startDate?: string; endDate?: string; search?: string }) => void
}

export function AdminOrdersTable({
  orders,
  counts,
  isLoading,
  onUpdateStatus,
  onInspectOrder,
  onRefresh,
}: AdminOrdersTableProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [dateError, setDateError] = useState<string | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

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

  const handleQuickNextAction = async (order: OrderRecord) => {
    const orderId = order.id || order._id || order.orderNumber
    let nextStatus: OrderStatus | null = null

    if (order.status === 'CONFIRMED') {
      nextStatus = 'PREPARING'
    } else if (order.status === 'PREPARING') {
      nextStatus = 'READY'
    } else if (order.status === 'READY') {
      nextStatus = 'DISPATCHED'
    } else if (order.status === 'DISPATCHED') {
      nextStatus = 'DELIVERED'
    }

    if (!nextStatus) return

    setUpdatingOrderId(orderId)
    try {
      await onUpdateStatus(orderId, nextStatus)
    } finally {
      setUpdatingOrderId(null)
    }
  }

  // Get next action label & button style
  const getActionInfo = (order: OrderRecord) => {
    if (order.status === 'PENDING_PAYMENT') {
      return {
        label: 'Awaiting Payment',
        disabled: true,
        className: 'btn-table-action btn-pending-action',
      }
    }
    if (order.status === 'CONFIRMED') {
      return {
        label: 'Start Prep',
        disabled: false,
        className: 'btn-table-action btn-prep-action',
      }
    }
    if (order.status === 'PREPARING') {
      return {
        label: 'Mark Ready',
        disabled: false,
        className: 'btn-table-action btn-ready-action',
      }
    }
    if (order.status === 'READY') {
      return {
        label: 'Dispatch',
        disabled: false,
        className: 'btn-table-action btn-dispatch-action',
      }
    }
    if (order.status === 'DISPATCHED') {
      return {
        label: 'Mark Delivered',
        disabled: false,
        className: 'btn-table-action btn-deliver-action',
      }
    }
    return {
      label: 'Delivered',
      disabled: true,
      className: 'btn-table-action btn-completed-action',
    }
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
                <th>Order Ref</th>
                <th>Customer</th>
                <th>Time Placed</th>
                <th>Items</th>
                <th>Total ($)</th>
                <th>Payment</th>
                <th>Order Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => {
                const orderId = ord.id || ord._id || ord.orderNumber
                const actionInfo = getActionInfo(ord)
                const isUpdating = updatingOrderId === orderId

                return (
                  <tr key={orderId}>
                    <td>
                      <span className="payment-ref-code">{ord.orderNumber}</span>
                    </td>
                    <td>
                      <div>
                        <strong>{ord.customerName}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {ord.customerPhone}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {ord.createdAt ? new Date(ord.createdAt).toLocaleString() : 'N/A'}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>
                        {(ord.items || []).reduce((s, i) => s + (i.quantity || 0), 0)} items
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#16a34a', fontSize: '0.95rem' }}>
                        ${(ord.totalAmount ?? 0).toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          ord.paymentStatus === 'VERIFIED'
                            ? 'status-available'
                            : ord.paymentStatus === 'REJECTED'
                            ? 'status-unavailable'
                            : 'status-pending'
                        }`}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td>
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
                        {ord.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions-group" style={{ justifyContent: 'flex-end', gap: '0.4rem' }}>
                        {!actionInfo.disabled && (
                          <button
                            type="button"
                            className={actionInfo.className}
                            onClick={() => handleQuickNextAction(ord)}
                            disabled={isUpdating}
                            title={`Transition order to next stage`}
                          >
                            {isUpdating ? 'Updating...' : actionInfo.label}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-table-action btn-details-action"
                          onClick={() => onInspectOrder(ord)}
                          title="Inspect complete order details and history"
                        >
                          Details
                        </button>
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
