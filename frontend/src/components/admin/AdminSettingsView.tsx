import { useState, useEffect } from 'react'
import type { RestaurantSettingsData } from '../../types/index.js'
import { api } from '../../api/client.js'
import { SaveIcon } from '../common/AdminIcons.js'

interface AdminSettingsViewProps {
  getToken: () => Promise<string | null>
  showToast: (msg: string) => void
  onSettingsUpdated?: (newSettings: RestaurantSettingsData) => void
}

export function AdminSettingsView({ getToken, showToast, onSettingsUpdated }: AdminSettingsViewProps) {
  const [settings, setSettings] = useState<RestaurantSettingsData>({
    restaurantName: 'BiteFlow',
    contactPhone: '+252-61xxxxxxx',
    contactEmail: 'kitchen@biteflow.com',
    operatingHours: '6:00 AM – 11:30 PM',
    restaurantStatus: 'OPEN',
    deliveryNotice: 'Free delivery on all orders within local delivery zones.',
    isDeliveryActive: true,
    currency: 'USD',
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    let isCancelled = false

    api
      .getAdminSettings(getToken)
      .then((res) => {
        if (!isCancelled && res.settings) {
          setSettings(res.settings)
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          const e = err as Error
          setError(e.message || 'Failed to load restaurant settings')
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false)
      })

    return () => {
      isCancelled = true
    }
  }, [getToken])

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirmModal(true)
  }

  const handleConfirmSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await api.updateAdminSettings(getToken, settings)
      if (res.settings) {
        setSettings(res.settings)
        if (onSettingsUpdated) {
          onSettingsUpdated(res.settings)
        }
      }
      setShowConfirmModal(false)
      showToast('Restaurant settings updated successfully!')
    } catch (err) {
      const e = err as Error
      setError(e.message || 'Failed to save settings')
      setShowConfirmModal(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="admin-settings-view">
      <div className="admin-section-header">
        <div>
          <h2 className="admin-section-heading">Restaurant Operational Settings</h2>
          <p className="admin-section-sub">
            Manage restaurant brand information, contact details, operating hours, and kitchen service status.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-banner" style={{ margin: '1rem 0' }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#6b7280' }}>
          Loading operational settings...
        </div>
      ) : (
        <form onSubmit={handleSaveClick} className="admin-settings-form-card">
          <div className="settings-fields-grid">
            {/* Restaurant Display Name */}
            <div className="form-group">
              <label htmlFor="settings-name" className="form-label">
                Restaurant Display Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="settings-name"
                type="text"
                className="form-input"
                value={settings.restaurantName}
                onChange={(e) => setSettings({ ...settings, restaurantName: e.target.value })}
                required
              />
              <span className="field-hint">Displayed in header, emails, and customer receipts.</span>
            </div>

            {/* Operational Status */}
            <div className="form-group">
              <label htmlFor="settings-status" className="form-label">
                Operational Status <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                id="settings-status"
                className="form-input form-select"
                value={settings.restaurantStatus}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    restaurantStatus: e.target.value as 'OPEN' | 'CLOSED' | 'BUSY',
                  })
                }
              >
                <option value="OPEN">OPEN (Accepting Orders)</option>
                <option value="BUSY">BUSY (High Order Volume)</option>
                <option value="CLOSED">CLOSED (Orders Paused)</option>
              </select>
              <span className="field-hint">Controls restaurant order reception state.</span>
            </div>

            {/* Delivery Hotline Phone */}
            <div className="form-group">
              <label htmlFor="settings-phone" className="form-label">
                Delivery Hotline Phone <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="settings-phone"
                type="text"
                className="form-input"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                required
              />
              <span className="field-hint">Customer support telephone number.</span>
            </div>

            {/* Support Email */}
            <div className="form-group">
              <label htmlFor="settings-email" className="form-label">
                Support & Kitchen Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="settings-email"
                type="email"
                className="form-input"
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                required
              />
              <span className="field-hint">Primary email for customer inquiries.</span>
            </div>

            {/* Operating Hours */}
            <div className="form-group">
              <label htmlFor="settings-hours" className="form-label">
                Kitchen Operating Hours <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="settings-hours"
                type="text"
                className="form-input"
                value={settings.operatingHours}
                onChange={(e) => setSettings({ ...settings, operatingHours: e.target.value })}
                required
              />
              <span className="field-hint">e.g. 6:00 AM – 11:30 PM daily.</span>
            </div>

            {/* Standard Financial Currency */}
            <div className="form-group">
              <label htmlFor="settings-currency" className="form-label">
                Operating Currency
              </label>
              <input
                id="settings-currency"
                type="text"
                className="form-input"
                value={`${settings.currency || 'USD'} ($)`}
                disabled
                style={{ opacity: 0.85, cursor: 'not-allowed' }}
              />
              <span className="field-hint">BiteFlow standard monetary currency (USD).</span>
            </div>

            {/* Delivery Active Toggle */}
            <div className="form-group">
              <label htmlFor="settings-delivery-active" className="form-label">
                Delivery Service
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                <input
                  id="settings-delivery-active"
                  type="checkbox"
                  style={{ width: '18px', height: '18px', accentColor: '#ea580c' }}
                  checked={settings.isDeliveryActive}
                  onChange={(e) => setSettings({ ...settings, isDeliveryActive: e.target.checked })}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                  Delivery service active
                </span>
              </div>
            </div>

            {/* Delivery Notice / Policy */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label htmlFor="settings-notice" className="form-label">
                Delivery Instructions & Notice Banner
              </label>
              <textarea
                id="settings-notice"
                className="form-input form-textarea"
                rows={3}
                value={settings.deliveryNotice}
                onChange={(e) => setSettings({ ...settings, deliveryNotice: e.target.value })}
              />
              <span className="field-hint">
                Special announcements or fulfillment notes presented during customer checkout.
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="submit"
              className="btn-action btn-checkout"
              disabled={isSaving}
              style={{ minWidth: '160px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <SaveIcon size={16} />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => !isSaving && setShowConfirmModal(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '480px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Confirm Restaurant Settings Update</h3>
              <p className="modal-subtitle">
                Are you sure you want to update the operational settings for <strong>{settings.restaurantName}</strong>? These settings will take effect immediately across the restaurant platform.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn-action btn-back-cart"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-action btn-checkout"
                onClick={handleConfirmSave}
                disabled={isSaving}
              >
                {isSaving ? 'Updating...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
