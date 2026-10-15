import type { FormEvent } from 'react'
import type { Category, Product } from '../../types/index.js'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  editingProduct: Product | null
  categories: Category[]
  productName: string
  setProductName: (name: string) => void
  productDesc: string
  setProductDesc: (desc: string) => void
  productPrice: string
  setProductPrice: (price: string) => void
  productImage: string
  setProductImage: (image: string) => void
  productCategoryId: string
  setProductCategoryId: (id: string) => void
  productAvailable: boolean
  setProductAvailable: (available: boolean) => void
  onSubmit: (e: FormEvent) => void
}

export function ProductModal({
  isOpen,
  onClose,
  editingProduct,
  categories,
  productName,
  setProductName,
  productDesc,
  setProductDesc,
  productPrice,
  setProductPrice,
  productImage,
  setProductImage,
  productCategoryId,
  setProductCategoryId,
  productAvailable,
  setProductAvailable,
  onSubmit,
}: ProductModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '560px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          &#10005;
        </button>
        <h3 className="modal-title">
          {editingProduct ? 'Edit Product' : 'Create New Product'}
        </h3>
        <p className="modal-subtitle">
          Add or modify food dishes and beverages on your menu
        </p>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Truffle Wild Mushroom Pizza"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                value={productCategoryId}
                onChange={(e) => setProductCategoryId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea
              className="form-textarea"
              rows={2}
              placeholder="Ingredients, preparation details, flavor notes..."
              value={productDesc}
              onChange={(e) => setProductDesc(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Image Path / URL</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. /delicious-burger.jpg or https://..."
              value={productImage}
              onChange={(e) => setProductImage(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-checkbox-label">
              <input
                type="checkbox"
                checked={productAvailable}
                onChange={(e) => setProductAvailable(e.target.checked)}
              />
              Mark as Available for Customer Orders
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
              {editingProduct ? 'Save Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
