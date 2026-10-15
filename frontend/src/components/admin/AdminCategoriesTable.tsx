import type { Category } from '../../types/index.js'

interface AdminCategoriesTableProps {
  categories: Category[]
  onAddCategory: () => void
  onEditCategory: (cat: Category) => void
  onDeleteCategory: (cat: Category) => void
}

export function AdminCategoriesTable({
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}: AdminCategoriesTableProps) {
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
          Menu Categories
        </h2>
        <button
          className="btn-action btn-update"
          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          onClick={onAddCategory}
        >
          + Add New Category
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Description</th>
              <th>Linked Products</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c._id}>
                <td>
                  <strong style={{ fontSize: '1rem', color: '#111827' }}>{c.name}</strong>
                </td>
                <td style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  {c.description || '—'}
                </td>
                <td>
                  <span className="category-badge">
                    {c.productCount ?? 0} items
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${c.isActive ? 'available' : 'unavailable'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                    <button
                      className="table-btn table-btn-edit"
                      onClick={() => onEditCategory(c)}
                    >
                      Edit
                    </button>
                    <button
                      className="table-btn table-btn-delete"
                      onClick={() => onDeleteCategory(c)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
