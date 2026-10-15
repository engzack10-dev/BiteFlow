import { useState } from 'react'
import type { CustomerRecord, OrderRecord } from '../../types/index.js'
import { CustomersIcon, PhoneIcon } from '../common/AdminIcons.js'

interface AdminCustomersTableProps {
  customers: CustomerRecord[]
  isLoading: boolean
  onRefresh: (search?: string) => void
  onInspectOrder: (order: OrderRecord) => void
  onLoadCustomerDetail: (id: string) => Promise<{ customer: CustomerRecord & { orders: OrderRecord[] } }>
}

export function AdminCustomersTable({
  customers,
  isLoading,
  onRefresh,
  onInspectOrder,
  onLoadCustomerDetail,
}: AdminCustomersTableProps) {
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<{
    customer: CustomerRecord
    orders: OrderRecord[]
  } | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onRefresh(search)
  }

  const handleOpenCustomer = async (cust: CustomerRecord) => {
    setIsLoadingDetail(true)
    try {
      const res = await onLoadCustomerDetail(cust.clerkId)
      setSelectedCustomer({
        customer: res.customer,
        orders: res.customer.orders || [],
      })
    } catch {
      // Fallback to customer info if detail fetch fails
      setSelectedCustomer({
        customer: cust,
        orders: [],
      })
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const formatDate = (iso?: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="admin-customers-view">
      {/* Header & Search */}
      <div className="admin-section-header">
        <div>
          <h2 className="admin-section-heading">Customer Directory</h2>
          <p className="admin-section-sub">
            Verified restaurant customer records, order frequency, total spend, and contact profiles.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="admin-search-form" style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="input-text"
            placeholder="Search customer, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '260px' }}
          />
          <button type="submit" className="btn-action btn-inspect">
            Search
          </button>
          {search && (
            <button
              type="button"
              className="btn-action btn-continue"
              onClick={() => {
                setSearch('')
                onRefresh('')
              }}
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Customers Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6b7280' }}>
          Loading customer directory...
        </div>
      ) : customers.length === 0 ? (
        <div className="customer-orders-empty" style={{ margin: '2rem 0' }}>
          <div className="empty-orders-icon">
            <CustomersIcon size={36} />
          </div>
          <h3 className="empty-orders-title">No Customers Found</h3>
          <p className="empty-orders-desc">
            {search ? `No customer matching "${search}" was found.` : 'Registered customers will appear here.'}
          </p>
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Location / Area</th>
                <th>Total Orders</th>
                <th>Verified Spend</th>
                <th>Latest Order</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.clerkId}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{c.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>ID: {c.clerkId.slice(-8)}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{c.email}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <PhoneIcon size={12} style={{ opacity: 0.65 }} />
                      <span>{c.phone}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{c.deliveryArea}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.deliveryAddress}
                    </div>
                  </td>
                  <td>
                    <span className="customer-orders-pill">{c.totalOrders} {c.totalOrders === 1 ? 'order' : 'orders'}</span>
                  </td>
                  <td>
                    <strong style={{ color: '#059669', fontSize: '1rem' }}>
                      ${c.verifiedSpent.toFixed(2)}
                    </strong>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{formatDate(c.lastOrderDate)}</div>
                    {c.latestOrderNumber && (
                      <span className="order-ref-badge" style={{ fontSize: '0.7rem' }}>
                        {c.latestOrderNumber}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-action btn-inspect"
                      onClick={() => handleOpenCustomer(c)}
                      disabled={isLoadingDetail}
                    >
                      View Profile →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Profile & History Inspection Modal */}
      {selectedCustomer && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedCustomer(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-card customer-order-modal-card"
            style={{ maxWidth: '720px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-btn"
              onClick={() => setSelectedCustomer(null)}
              aria-label="Close customer modal"
            >
              &#10005;
            </button>

            <div className="modal-header">
              <span className="checkout-step-badge">Customer Profile</span>
              <h3 className="modal-title">{selectedCustomer.customer.name}</h3>
              <p className="modal-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{selectedCustomer.customer.email}</span>
                <span>&bull;</span>
                <PhoneIcon size={12} style={{ opacity: 0.7 }} />
                <span>{selectedCustomer.customer.phone}</span>
              </p>
            </div>

            {/* Overview cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', margin: '1rem 0' }}>
              <div className="kpi-mini-card">
                <span className="mini-label">Total Orders</span>
                <span className="mini-value">{selectedCustomer.customer.totalOrders}</span>
              </div>
              <div className="kpi-mini-card">
                <span className="mini-label">Verified Spend</span>
                <span className="mini-value" style={{ color: '#059669' }}>
                  ${selectedCustomer.customer.verifiedSpent.toFixed(2)}
                </span>
              </div>
              <div className="kpi-mini-card">
                <span className="mini-label">Primary Area</span>
                <span className="mini-value" style={{ fontSize: '1rem' }}>
                  {selectedCustomer.customer.deliveryArea || '—'}
                </span>
              </div>
            </div>

            {/* Orders History List */}
            <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '1.25rem 0 0.5rem', color: 'var(--text-dark)' }}>
              Order History ({selectedCustomer.orders.length})
            </h4>

            {selectedCustomer.orders.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: '0.9rem', padding: '1rem 0' }}>
                No past orders found for this customer profile.
              </p>
            ) : (
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: '8px' }}>
                <table className="admin-data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Order Status</th>
                      <th>Payment</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomer.orders.map((o) => (
                      <tr key={o.orderNumber}>
                        <td><strong>{o.orderNumber}</strong></td>
                        <td style={{ fontSize: '0.8rem' }}>{formatDate(o.createdAt)}</td>
                        <td style={{ fontWeight: 700 }}>${o.totalAmount.toFixed(2)}</td>
                        <td>
                          <span className={`status-badge status-${o.status.toLowerCase()}`}>
                            {o.status}
                          </span>
                        </td>
                        <td>
                          <span className={`payment-badge payment-${o.paymentStatus.toLowerCase()}`}>
                            {o.paymentStatus}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-action btn-inspect"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => {
                              setSelectedCustomer(null)
                              onInspectOrder(o)
                            }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button
                type="button"
                className="btn-action btn-continue"
                onClick={() => setSelectedCustomer(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
