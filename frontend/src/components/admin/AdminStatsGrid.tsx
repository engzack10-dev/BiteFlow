interface AdminStatsGridProps {
  categoriesCount: number
  productsCount: number
  availableProductsCount: number
  totalCustomers: number
  pendingPaymentsCount?: number
  activeOrdersCount?: number
}

export function AdminStatsGrid({
  categoriesCount,
  productsCount,
  availableProductsCount,
  totalCustomers,
  pendingPaymentsCount = 0,
  activeOrdersCount = 0,
}: AdminStatsGridProps) {
  return (
    <div className="admin-stats-grid">
      <div className="admin-stat-card">
        <div className="admin-stat-label">Active Orders</div>
        <div className="admin-stat-value" style={{ color: '#3b82f6' }}>
          {activeOrdersCount}
        </div>
      </div>
      <div className="admin-stat-card">
        <div className="admin-stat-label">Pending Payments</div>
        <div className="admin-stat-value" style={{ color: pendingPaymentsCount > 0 ? '#e86a2a' : '#10b981' }}>
          {pendingPaymentsCount}
        </div>
      </div>
      <div className="admin-stat-card">
        <div className="admin-stat-label">Total Categories</div>
        <div className="admin-stat-value" style={{ color: '#f59e0b' }}>
          {categoriesCount}
        </div>
      </div>
      <div className="admin-stat-card">
        <div className="admin-stat-label">Total Products</div>
        <div className="admin-stat-value" style={{ color: '#10b981' }}>
          {productsCount}
        </div>
      </div>
      <div className="admin-stat-card">
        <div className="admin-stat-label">Available Products</div>
        <div className="admin-stat-value" style={{ color: '#3b82f6' }}>
          {availableProductsCount}
        </div>
      </div>
      <div className="admin-stat-card">
        <div className="admin-stat-label">Total Customers</div>
        <div className="admin-stat-value">
          {totalCustomers}
        </div>
      </div>
    </div>
  )
}
