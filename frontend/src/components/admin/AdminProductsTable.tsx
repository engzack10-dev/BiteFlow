import type { Product } from '../../types/index.js'

interface AdminProductsTableProps {
  products: Product[]
  onAddProduct: () => void
  onToggleAvailability: (prod: Product) => void
  onEditProduct: (prod: Product) => void
  onDeleteProduct: (prod: Product) => void
}

export function AdminProductsTable({
  products,
  onAddProduct,
  onToggleAvailability,
  onEditProduct,
  onDeleteProduct,
}: AdminProductsTableProps) {
  return (
    <div className="admin-section">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h2 className="admin-section-title" style={{ margin: 0 }}>
          Restaurant Products
        </h2>
        <button
          className="btn-action btn-update"
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={onAddProduct}
        >
          + Add New Product
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-users-table">
          <thead>
            <tr>
              <th style={{ width: '8%' }}>Image</th>
              <th>Name & Description</th>
              <th>Category</th>
              <th>Price</th>
              <th>Availability Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const catName =
                typeof p.category === 'object' && p.category ? p.category.name : 'Unassigned'
              return (
                <tr key={p._id}>
                  <td>
                    <img
                      src={p.image}
                      alt={p.name}
                      style={{
                        width: '48px',
                        height: '48px',
                        objectFit: 'contain',
                        borderRadius: '4px',
                      }}
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src = '/delicious-burger.jpg'
                      }}
                    />
                  </td>
                  <td>
                    <strong style={{ fontSize: '1rem', color: '#111827' }}>{p.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', maxWidth: '300px' }}>
                      {p.description}
                    </div>
                  </td>
                  <td>
                    <span className="category-badge">{catName}</span>
                  </td>
                  <td>
                    <strong style={{ color: '#f59e0b' }}>${p.price.toFixed(2)}</strong>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${p.isAvailable ? 'available' : 'unavailable'}`}
                    >
                      {p.isAvailable ? '✓ Available' : '✕ Unavailable'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        className="table-btn table-btn-toggle"
                        onClick={() => onToggleAvailability(p)}
                        title="Toggle availability status"
                      >
                        {p.isAvailable ? 'Mark Sold Out' : 'Mark Available'}
                      </button>
                      <button
                        className="table-btn table-btn-edit"
                        onClick={() => onEditProduct(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="table-btn table-btn-delete"
                        onClick={() => onDeleteProduct(p)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
