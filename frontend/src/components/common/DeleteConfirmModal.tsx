interface DeleteConfirmModalProps {
  type: 'category' | 'product'
  name: string
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteConfirmModal({
  type,
  name,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onCancel}>
          &#10005;
        </button>
        <h3 className="modal-title" style={{ color: '#dc2626' }}>Confirm Deletion</h3>
        <p className="modal-subtitle">
          Are you sure you want to delete {type} "<strong>{name}</strong>"?
          {type === 'category' && (
            <span style={{ display: 'block', marginTop: '0.5rem', color: '#b45309' }}>
              Note: Categories with active products cannot be deleted.
            </span>
          )}
        </p>

        <div className="form-actions">
          <button
            type="button"
            className="btn-action btn-continue"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="table-btn table-btn-delete"
            style={{ padding: '0.65rem 1.4rem', fontSize: '0.95rem' }}
            onClick={onConfirm}
          >
            Yes, Delete
          </button>
        </div>
      </div>
    </div>
  )
}
