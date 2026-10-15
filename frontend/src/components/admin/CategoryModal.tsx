import type { FormEvent } from 'react'
import type { Category } from '../../types/index.js'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  editingCategory: Category | null
  categoryName: string
  setCategoryName: (name: string) => void
  categoryDesc: string
  setCategoryDesc: (desc: string) => void
  categoryActive: boolean
  setCategoryActive: (active: boolean) => void
  onSubmit: (e: FormEvent) => void
}

export function CategoryModal({
  isOpen,
  onClose,
  editingCategory,
  categoryName,
  setCategoryName,
  categoryDesc,
  setCategoryDesc,
  categoryActive,
  setCategoryActive,
  onSubmit,
}: CategoryModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          &#10005;
        </button>
        <h3 className="modal-title">
          {editingCategory ? 'Edit Category' : 'Create New Category'}
        </h3>
        <p className="modal-subtitle">
          Organize your restaurant menu items into logical groups
        </p>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Category Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Artisanal Desserts"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Brief description of dishes in this category..."
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-checkbox-label">
              <input
                type="checkbox"
                checked={categoryActive}
                onChange={(e) => setCategoryActive(e.target.checked)}
              />
              Active in Storefront
            </label>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-action btn-continue"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn-action btn-update">
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
