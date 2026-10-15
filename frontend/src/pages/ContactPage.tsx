import { useState } from 'react'
import { api } from '../api/client.js'
import {
  PhoneIcon,
  MailIcon,
  ClockIcon,
  CheckCircleIcon,
  MessageSquareIcon,
  DeliveryIcon,
  AlertTriangleIcon,
} from '../components/common/AdminIcons.js'

import type { RestaurantSettingsData } from '../types/index.js'

interface ContactPageProps {
  isSignedIn?: boolean
  userEmail?: string
  userName?: string
  showToast?: (message: string) => void
  onNavigateToMenu?: () => void
  restaurantSettings?: RestaurantSettingsData | null
}

const CATEGORIES = [
  'General Inquiry',
  'Order Question & Support',
  'Food Quality & Taste',
  'Delivery Experience',
  'Catering & Private Events',
  'Suggestions & Compliments',
  'Other',
] as const

interface FormFields {
  name: string
  email: string
  phone: string
  category: string
  subject: string
  message: string
}

interface FieldErrors {
  name?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
}

export function ContactPage({
  isSignedIn = false,
  userEmail = '',
  userName = '',
  showToast,
  onNavigateToMenu,
  restaurantSettings,
}: ContactPageProps) {
  const hotline = restaurantSettings?.contactPhone || '+252-61xxxxxxx'
  const supportEmail = restaurantSettings?.contactEmail || 'kitchen@biteflow.com'
  const operatingHours = restaurantSettings?.operatingHours || '6:00 AM – 11:30 PM'
  const [formData, setFormData] = useState<FormFields>(() => ({
    name: userName || '',
    email: userEmail || '',
    phone: '',
    category: 'General Inquiry',
    subject: 'General Inquiry',
    message: '',
  }))

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedFeedbackId, setSubmittedFeedbackId] = useState<string | null>(null)
  const [confirmedEmail, setConfirmedEmail] = useState<string>('')

  const handleInputChange = (field: keyof FormFields, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      // Auto-update subject when category changes if subject matches previous category
      if (field === 'category' && (prev.subject === prev.category || !prev.subject.trim())) {
        next.subject = value === 'Other' ? '' : value
      }
      return next
    })

    // Clear field-level error on change
    if (fieldErrors[field as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    if (submitError) {
      setSubmitError(null)
    }
  }

  const validateForm = (): boolean => {
    const errors: FieldErrors = {}
    const trimmedName = formData.name.trim()
    const trimmedEmail = formData.email.trim()
    const trimmedSubject = formData.subject.trim()
    const trimmedMessage = formData.message.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!trimmedName) {
      errors.name = 'Full name is required'
    } else if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters'
    } else if (trimmedName.length > 100) {
      errors.name = 'Name cannot exceed 100 characters'
    }

    if (!trimmedEmail) {
      errors.email = 'Email address is required'
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address (e.g. you@example.com)'
    } else if (trimmedEmail.length > 150) {
      errors.email = 'Email cannot exceed 150 characters'
    }

    if (formData.phone.trim().length > 30) {
      errors.phone = 'Phone number cannot exceed 30 characters'
    }

    if (!trimmedSubject) {
      errors.subject = 'Subject is required'
    } else if (trimmedSubject.length < 2) {
      errors.subject = 'Subject must be at least 2 characters'
    } else if (trimmedSubject.length > 150) {
      errors.subject = 'Subject cannot exceed 150 characters'
    }

    if (!trimmedMessage) {
      errors.message = 'Message content is required'
    } else if (trimmedMessage.length < 5) {
      errors.message = 'Message must be at least 5 characters'
    } else if (trimmedMessage.length > 2000) {
      errors.message = 'Message cannot exceed 2,000 characters'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await api.submitCustomerFeedback({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      })

      if (response.success && response.feedbackId) {
        setConfirmedEmail(formData.email.trim())
        setSubmittedFeedbackId(response.feedbackId)
        if (showToast) {
          showToast('Feedback submitted successfully! Thank you.')
        }
      } else {
        throw new Error(response.message || 'Submission was not accepted by server.')
      }
    } catch (err) {
      const e = err as Error & { data?: { error?: string } }
      const errorMsg =
        e.data?.error || e.message || 'Network error: could not submit your feedback. Please try again.'
      setSubmitError(errorMsg)
      if (showToast) {
        showToast(`Failed: ${errorMsg}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetForm = () => {
    setSubmittedFeedbackId(null)
    setFormData({
      name: isSignedIn ? userName || '' : '',
      email: isSignedIn ? userEmail || '' : '',
      phone: '',
      category: 'General Inquiry',
      subject: 'General Inquiry',
      message: '',
    })
    setFieldErrors({})
    setSubmitError(null)
  }

  return (
    <div className="contact-page-container" style={{ maxWidth: '1100px', margin: '2rem auto 4rem', padding: '0 1.5rem' }}>
      {/* Page Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="menu-script-heading contact-page-title" style={{ fontSize: '2.8rem', color: '#ea580c', marginBottom: '0.5rem' }}>
          Contact & Feedback
        </h1>
        <p className="contact-page-subtitle" style={{ maxWidth: '640px', margin: '0 auto' }}>
          Have a question about your order, food quality, dietary inquiries, or catering?
          Our team is here to listen and help.
        </p>
      </div>

      {/* Main Two-Column Layout */}
      <div
        className="contact-layout-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Restaurant Info Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Quick Contact Card */}
          <div
            className="contact-card contact-info-card"
            style={{
              padding: '1.75rem',
            }}
          >
            <h2 className="contact-card-heading" style={{ marginBottom: '1.25rem' }}>
              Restaurant Direct Lines
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'rgba(234, 88, 12, 0.1)',
                    color: '#ea580c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <PhoneIcon size={20} />
                </div>
                <div>
                  <span className="contact-eyebrow">
                    Delivery Hotline
                  </span>
                  <div className="contact-value">
                    {hotline}
                  </div>
                  <span className="contact-caption">
                    Immediate assistance for active deliveries
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'rgba(13, 148, 136, 0.1)',
                    color: '#0d9488',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <MailIcon size={20} />
                </div>
                <div>
                  <span className="contact-eyebrow">
                    Kitchen & Support Email
                  </span>
                  <div className="contact-value">
                    {supportEmail}
                  </div>
                  <span className="contact-caption">
                    General inquiries, feedback, & catering
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ClockIcon size={20} />
                </div>
                <div>
                  <span className="contact-eyebrow">
                    Service Hours
                  </span>
                  <div className="contact-value">
                    {operatingHours}
                  </div>
                  <span className="contact-caption">
                    Open every day, rain or shine
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery-Only Restaurant Note */}
          <div className="contact-notice-card">
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <DeliveryIcon size={20} style={{ color: '#ea580c' }} />
              <h3 className="contact-notice-heading">
                Delivery-Only Kitchen
              </h3>
            </div>
            <p className="contact-notice-text">
              BiteFlow operates as a dedicated cloud kitchen. Every burger, pizza, and dish is prepared fresh to order
              and couriered directly to your location with verified real-time tracking.
            </p>
          </div>
        </div>

        {/* Right Column: Feedback Form or Success State */}
        <div
          className="contact-card contact-form-card"
          style={{
            padding: '2rem',
          }}
        >
          {submittedFeedbackId ? (
            /* SUCCESS CONFIRMATION STATE */
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(5, 150, 105, 0.12)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                }}
              >
                <CheckCircleIcon size={38} />
              </div>

              <h2 className="contact-card-heading" style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>
                Thank You! Message Received
              </h2>

              <p className="contact-page-subtitle" style={{ fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                Your message has been securely submitted and recorded in our management queue.
                {confirmedEmail ? (
                  <>
                    <br />
                    If a response is required, our manager will reach out directly to{' '}
                    <strong style={{ color: 'var(--text-dark)' }}>{confirmedEmail}</strong>.
                  </>
                ) : null}
              </p>

              <div
                className="contact-ref-badge"
                style={{
                  background: 'var(--bg-page, #f9fafb)',
                  border: '1px dashed var(--border-light, #e5e7eb)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  color: 'var(--text-muted)',
                  display: 'inline-block',
                  marginBottom: '2rem',
                }}
              >
                Reference ID: <strong style={{ color: 'var(--text-dark)' }}>#{submittedFeedbackId.slice(-6).toUpperCase()}</strong>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-action btn-continue contact-btn-secondary"
                  onClick={handleResetForm}
                >
                  Send Another Message
                </button>
                {onNavigateToMenu && (
                  <button
                    type="button"
                    className="btn-action btn-checkout contact-btn-submit"
                    style={{ background: '#ea580c', borderColor: '#ea580c' }}
                    onClick={onNavigateToMenu}
                  >
                    Explore Menu & Order
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* FEEDBACK SUBMISSION FORM */
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 className="contact-card-heading" style={{ fontSize: '1.4rem', marginBottom: '0.35rem' }}>
                  Send Us a Message
                </h2>
                <p className="contact-caption" style={{ fontSize: '0.875rem' }}>
                  We value your feedback. Guest submissions and verified customer accounts are both welcome.
                </p>
              </div>

              {/* Authentication Status Notice */}
              {isSignedIn ? (
                <div
                  className="contact-auth-notice"
                  style={{
                    background: 'rgba(13, 148, 136, 0.08)',
                    border: '1px solid rgba(13, 148, 136, 0.25)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.95rem',
                    color: '#0f766e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.25rem',
                  }}
                >
                  <span>
                    Submitting as verified account:{' '}
                    <strong>{userEmail || userName || 'Customer'}</strong>
                  </span>
                  <span
                    className="contact-auth-pill"
                    style={{
                      background: '#0d9488',
                      color: '#ffffff',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                    }}
                  >
                    ✓ Verified
                  </span>
                </div>
              ) : (
                <div
                  className="contact-auth-notice"
                  style={{
                    background: 'rgba(107, 114, 128, 0.06)',
                    border: '1px solid var(--border-light, #e5e7eb)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.95rem',
                    fontSize: '0.825rem',
                    color: 'var(--text-muted, #6b7280)',
                    marginBottom: '1.25rem',
                  }}
                >
                  Submitting as Guest. No account creation required.
                </div>
              )}

              {/* Top Submit Error Banner */}
              {submitError && (
                <div
                  className="checkout-alert checkout-alert-error contact-caption"
                  role="alert"
                  style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <AlertTriangleIcon size={16} />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Row 1: Name and Email */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <label
                    htmlFor="feedback-name"
                    className="contact-field-label"
                  >
                    Your Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="feedback-name"
                    type="text"
                    className={`form-input contact-input-field ${fieldErrors.name ? 'input-error' : ''}`}
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    maxLength={100}
                    style={{
                      borderColor: fieldErrors.name ? '#ef4444' : undefined,
                    }}
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                  />
                  {fieldErrors.name && (
                    <span id="name-error" className="contact-caption" style={{ display: 'block', color: '#ef4444', marginTop: '0.25rem' }}>
                      {fieldErrors.name}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="feedback-email"
                    className="contact-field-label"
                  >
                    Email Address <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    className={`form-input contact-input-field ${fieldErrors.email ? 'input-error' : ''}`}
                    placeholder="e.g. you@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    maxLength={150}
                    style={{
                      borderColor: fieldErrors.email ? '#ef4444' : undefined,
                    }}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  />
                  {fieldErrors.email && (
                    <span id="email-error" className="contact-caption" style={{ display: 'block', color: '#ef4444', marginTop: '0.25rem' }}>
                      {fieldErrors.email}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Category and Optional Phone */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <div>
                  <label
                    htmlFor="feedback-category"
                    className="contact-field-label"
                  >
                    Message Category
                  </label>
                  <select
                    id="feedback-category"
                    className="form-input form-select contact-input-field"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="feedback-phone"
                    className="contact-field-label"
                  >
                    Phone Number <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <input
                    id="feedback-phone"
                    type="tel"
                    className={`form-input contact-input-field ${fieldErrors.phone ? 'input-error' : ''}`}
                    placeholder="e.g. +252-61xxxxxxx"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    maxLength={30}
                    style={{
                      borderColor: fieldErrors.phone ? '#ef4444' : undefined,
                    }}
                  />
                  {fieldErrors.phone && (
                    <span className="contact-caption" style={{ display: 'block', color: '#ef4444', marginTop: '0.25rem' }}>
                      {fieldErrors.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 3: Subject */}
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="feedback-subject"
                  className="contact-field-label"
                >
                  Subject / Topic <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="feedback-subject"
                  type="text"
                  className={`form-input contact-input-field ${fieldErrors.subject ? 'input-error' : ''}`}
                  placeholder="e.g. Question about allergy precautions or catering"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  maxLength={150}
                  style={{
                    borderColor: fieldErrors.subject ? '#ef4444' : undefined,
                  }}
                  aria-invalid={!!fieldErrors.subject}
                  aria-describedby={fieldErrors.subject ? 'subject-error' : undefined}
                />
                {fieldErrors.subject && (
                  <span id="subject-error" className="contact-caption" style={{ display: 'block', color: '#ef4444', marginTop: '0.25rem' }}>
                    {fieldErrors.subject}
                  </span>
                )}
              </div>

              {/* Row 4: Message Textarea */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label
                    htmlFor="feedback-message"
                    className="contact-field-label"
                    style={{ marginBottom: 0 }}
                  >
                    Your Message <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span
                    className="contact-caption"
                    style={{
                      fontSize: '0.75rem',
                      color: formData.message.length > 1900 ? '#ef4444' : 'var(--text-muted)',
                    }}
                  >
                    {formData.message.length} / 2,000
                  </span>
                </div>
                <textarea
                  id="feedback-message"
                  className={`form-input form-textarea contact-input-field ${fieldErrors.message ? 'input-error' : ''}`}
                  rows={5}
                  placeholder="Tell us about your experience, share feedback, or ask a question..."
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  maxLength={2000}
                  style={{
                    resize: 'vertical',
                    minHeight: '110px',
                    lineHeight: 1.5,
                    borderColor: fieldErrors.message ? '#ef4444' : undefined,
                  }}
                  aria-invalid={!!fieldErrors.message}
                  aria-describedby={fieldErrors.message ? 'message-error' : undefined}
                />
                {fieldErrors.message ? (
                  <span id="message-error" className="contact-caption" style={{ display: 'block', color: '#ef4444', marginTop: '0.25rem' }}>
                    {fieldErrors.message}
                  </span>
                ) : (
                  <span className="contact-caption" style={{ display: 'block', marginTop: '0.25rem' }}>
                    Please include order reference numbers or details if asking about a specific delivery.
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-action btn-checkout contact-btn-submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '0.85rem 1.5rem',
                  fontSize: '1rem',
                  borderRadius: '10px',
                  background: isSubmitting ? '#9ca3af' : '#ea580c',
                  borderColor: isSubmitting ? '#9ca3af' : '#ea580c',
                  color: '#ffffff',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
                }}
              >
                <MessageSquareIcon size={18} />
                <span>{isSubmitting ? 'Sending Message...' : 'Submit Feedback & Message'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
