import { useState } from 'react'
import { api } from '../api/client.js'
import {
  CheckCircleIcon,
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

import {
  PlaceholderLocationIcon,
  PlaceholderPhoneIcon,
  PlaceholderMailIcon,
  PlaceholderClockIcon,
  PlaceholderSendIcon,
} from '../components/common/PlaceholderIcons.js'

export function ContactPage({
  isSignedIn = false,
  userEmail = '',
  userName = '',
  showToast,
  onNavigateToMenu,
  restaurantSettings,
}: ContactPageProps) {
  const hotline = restaurantSettings?.contactPhone || '+252 61 734 3299'
  const supportEmail = restaurantSettings?.contactEmail || 'kitchen@biteflow.com'
  const operatingHours = restaurantSettings?.operatingHours || 'Everyday: 10:00 AM – 10:00 PM'
  const address = '42 Flavor Street, Manhattan, New York, NY 10001'

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
      if (field === 'category' && (prev.subject === prev.category || !prev.subject.trim())) {
        next.subject = value === 'Other' ? '' : value
      }
      return next
    })

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
    <div className="contact-section-container">
      {/* Centered Hero Header */}
      <div className="contact-hero-header">
        <span className="contact-hero-script">Get In Touch</span>
        <h1 className="contact-hero-title">
          Contact <span className="contact-hero-title-accent">Us</span>
        </h1>
        <div className="contact-hero-divider" aria-hidden="true" />
        <p className="contact-hero-subtitle">
          Have a question, feedback, or want to plan a special event?
          <br />
          We&apos;d love to hear from you.
        </p>
      </div>

      {/* Main 2-Column Cards Grid */}
      <div className="contact-two-card-grid">
        {/* Left Dark Card ("Let's Talk") */}
        <aside className="contact-dark-card" aria-label="Restaurant contact details">
          <div className="contact-dark-card-top">
            <h2 className="contact-talk-heading">Let&apos;s Talk</h2>
            <p className="contact-talk-subtext">
              We typically respond within 2 hours during business hours.
            </p>

            <div className="contact-details-list">
              {/* Address */}
              <div className="contact-detail-item">
                <div className="contact-detail-icon-box">
                  <PlaceholderLocationIcon size={19} />
                </div>
                <div className="contact-detail-content">
                  <span className="contact-detail-label">ADDRESS</span>
                  <p className="contact-detail-text">
                    {address}
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="contact-detail-item">
                <div className="contact-detail-icon-box">
                  <PlaceholderPhoneIcon size={19} />
                </div>
                <div className="contact-detail-content">
                  <span className="contact-detail-label">PHONE</span>
                  <a href={`tel:${hotline.replace(/\s+/g, '')}`} className="contact-detail-link">
                    {hotline}
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="contact-detail-item">
                <div className="contact-detail-icon-box">
                  <PlaceholderMailIcon size={19} />
                </div>
                <div className="contact-detail-content">
                  <span className="contact-detail-label">EMAIL</span>
                  <a href={`mailto:${supportEmail}`} className="contact-detail-link">
                    {supportEmail}
                  </a>
                </div>
              </div>

              {/* Working Hours */}
              <div className="contact-detail-item">
                <div className="contact-detail-icon-box">
                  <PlaceholderClockIcon size={19} />
                </div>
                <div className="contact-detail-content">
                  <span className="contact-detail-label">WORKING HOURS</span>
                  <p className="contact-detail-text">
                    {operatingHours}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Social Icons Footer */}
          <div className="contact-social-row" aria-label="Social media links">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="contact-social-btn" aria-label="Facebook">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="contact-social-btn" aria-label="Instagram">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="contact-social-btn" aria-label="Twitter">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="contact-social-btn" aria-label="YouTube">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>
        </aside>

        {/* Right Form Card */}
        <div className="contact-form-card">
          {submittedFeedbackId ? (
            /* Success confirmation */
            <div className="contact-success-box">
              <div className="contact-success-icon-wrap">
                <CheckCircleIcon size={38} />
              </div>

              <h2 className="contact-success-title">
                Thank You! Message Received
              </h2>

              <p className="contact-success-desc">
                Your message has been securely submitted and recorded in our management queue.
                {confirmedEmail ? (
                  <>
                    <br />
                    If a response is required, our team will reach out directly to{' '}
                    <strong>{confirmedEmail}</strong>.
                  </>
                ) : null}
              </p>

              <div className="contact-ref-badge-wrap">
                Reference ID: <strong>#{submittedFeedbackId.slice(-6).toUpperCase()}</strong>
              </div>

              <div className="contact-success-actions">
                <button
                  type="button"
                  className="contact-btn-alt"
                  onClick={handleResetForm}
                >
                  Send Another Message
                </button>
                {onNavigateToMenu && (
                  <button
                    type="button"
                    className="contact-btn-brand"
                    onClick={onNavigateToMenu}
                  >
                    Explore Menu & Order
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Submission Form */
            <form onSubmit={handleSubmit} noValidate className="contact-form-inner">
              {isSignedIn && (
                <div className="contact-verified-banner">
                  <span>
                    Submitting as verified user: <strong>{userEmail || userName}</strong>
                  </span>
                  <span className="contact-verified-badge">✓ Verified</span>
                </div>
              )}

              {submitError && (
                <div className="contact-form-alert" role="alert">
                  <AlertTriangleIcon size={18} />
                  <span>{submitError}</span>
                </div>
              )}

              {/* 2-Column Inputs Grid */}
              <div className="contact-inputs-grid">
                {/* Your Name */}
                <div className="contact-field-group">
                  <label htmlFor="contact-name" className="contact-field-label">
                    Your Name <span className="contact-required-star">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    className={`contact-input ${fieldErrors.name ? 'contact-input-has-error' : ''}`}
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    maxLength={100}
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? 'name-err' : undefined}
                  />
                  {fieldErrors.name && (
                    <span id="name-err" className="contact-input-error-text">
                      {fieldErrors.name}
                    </span>
                  )}
                </div>

                {/* Email Address */}
                <div className="contact-field-group">
                  <label htmlFor="contact-email" className="contact-field-label">
                    Email Address <span className="contact-required-star">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    className={`contact-input ${fieldErrors.email ? 'contact-input-has-error' : ''}`}
                    placeholder="you@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    maxLength={150}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? 'email-err' : undefined}
                  />
                  {fieldErrors.email && (
                    <span id="email-err" className="contact-input-error-text">
                      {fieldErrors.email}
                    </span>
                  )}
                </div>

                {/* Phone Number */}
                <div className="contact-field-group">
                  <label htmlFor="contact-phone" className="contact-field-label">
                    Phone Number
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    className={`contact-input ${fieldErrors.phone ? 'contact-input-has-error' : ''}`}
                    placeholder="+1 (800) 000-0000"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    maxLength={30}
                  />
                  {fieldErrors.phone && (
                    <span className="contact-input-error-text">
                      {fieldErrors.phone}
                    </span>
                  )}
                </div>

                {/* Subject */}
                <div className="contact-field-group">
                  <label htmlFor="contact-subject" className="contact-field-label">
                    Subject <span className="contact-required-star">*</span>
                  </label>
                  <div className="contact-select-wrap">
                    <select
                      id="contact-subject"
                      className="contact-select"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <div className="contact-select-arrow" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="contact-field-group contact-message-group">
                <div className="contact-message-header">
                  <label htmlFor="contact-message" className="contact-field-label">
                    Message <span className="contact-required-star">*</span>
                  </label>
                  <span className="contact-char-count">
                    {formData.message.length} / 2,000
                  </span>
                </div>
                <textarea
                  id="contact-message"
                  className={`contact-textarea ${fieldErrors.message ? 'contact-input-has-error' : ''}`}
                  rows={5}
                  placeholder="Write your message here.."
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  maxLength={2000}
                  aria-invalid={!!fieldErrors.message}
                  aria-describedby={fieldErrors.message ? 'message-err' : undefined}
                />
                {fieldErrors.message && (
                  <span id="message-err" className="contact-input-error-text">
                    {fieldErrors.message}
                  </span>
                )}
              </div>

              {/* Submit Button (Pill button aligned left with paper plane icon) */}
              <div className="contact-submit-row">
                <button
                  type="submit"
                  className="contact-send-btn"
                  disabled={isSubmitting}
                >
                  <PlaceholderSendIcon size={16} />
                  <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
