import { useState, useEffect, useCallback } from 'react'
import { SignInButton } from '@clerk/react'
import type { CartItem, DeliveryInfo, OrderReviewResponse, OrderRecord, RestaurantSettingsData } from '../../types/index.js'
import { api } from '../../api/client.js'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  onReturnToCart: () => void
  cartItems: CartItem[]
  grandTotal: number
  isSignedIn: boolean
  userEmail?: string | null
  userName?: string | null
  getToken: () => Promise<string | null>
  onOrderSuccess: (order: OrderRecord) => void
  onTrackOrder?: (order: OrderRecord) => void
  restaurantSettings?: RestaurantSettingsData | null
}

type CheckoutStep = 'form' | 'review' | 'confirmation'

export function CheckoutModal({
  isOpen,
  onClose,
  onReturnToCart,
  cartItems,
  grandTotal,
  isSignedIn,
  userEmail,
  userName,
  getToken,
  onOrderSuccess,
  onTrackOrder,
  restaurantSettings,
}: CheckoutModalProps) {
  const [step, setStep] = useState<CheckoutStep>('form')

  const isClosed = Boolean(restaurantSettings?.restaurantStatus === 'CLOSED')
  const isDeliveryPaused = Boolean(restaurantSettings && restaurantSettings.isDeliveryActive === false)

  // Form State
  const [delivery, setDelivery] = useState<DeliveryInfo>(() => ({
    recipientName: userName || '',
    phone: '',
    deliveryAddress: '',
    deliveryArea: '',
    deliveryInstructions: '',
  }))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Server Review State
  const [isLoadingReview, setIsLoadingReview] = useState(false)
  const [serverReview, setServerReview] = useState<OrderReviewResponse | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // Order Submission State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [priceChangeWarning, setPriceChangeWarning] = useState<string | null>(null)
  const [placedOrder, setPlacedOrder] = useState<OrderRecord | null>(null)

  const resetModalState = useCallback(() => {
    setStep('form')
    setFieldErrors({})
    setServerReview(null)
    setReviewError(null)
    setSubmitError(null)
    setPriceChangeWarning(null)
    setPlacedOrder(null)
  }, [])

  const handleModalClose = useCallback(() => {
    resetModalState()
    onClose()
  }, [resetModalState, onClose])

  const handleReturnToCart = useCallback(() => {
    resetModalState()
    onReturnToCart()
  }, [resetModalState, onReturnToCart])

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen || isSubmitting) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleModalClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, handleModalClose])

  // Validation function
  const validateDeliveryForm = useCallback((): boolean => {
    const errors: Record<string, string> = {}

    const trimmedName = delivery.recipientName.trim()
    if (!trimmedName) {
      errors.recipientName = 'Recipient name is required'
    } else if (trimmedName.length < 2) {
      errors.recipientName = 'Recipient name must be at least 2 characters'
    } else if (trimmedName.length > 100) {
      errors.recipientName = 'Recipient name cannot exceed 100 characters'
    }

    const trimmedPhone = delivery.phone.trim()
    const phoneRegex = /^[+]?[\d\s\-()]{7,25}$/
    if (!trimmedPhone) {
      errors.phone = 'Contact phone number is required'
    } else if (trimmedPhone.length < 7) {
      errors.phone = 'Contact phone number must be at least 7 characters'
    } else if (trimmedPhone.length > 25) {
      errors.phone = 'Contact phone number cannot exceed 25 characters'
    } else if (!phoneRegex.test(trimmedPhone)) {
      errors.phone = 'Please enter a valid phone number (e.g. +1 555-0199 or 9876543210)'
    }

    const trimmedAddress = delivery.deliveryAddress.trim()
    if (!trimmedAddress) {
      errors.deliveryAddress = 'Delivery street address is required'
    } else if (trimmedAddress.length < 5) {
      errors.deliveryAddress = 'Delivery address must be at least 5 characters'
    } else if (trimmedAddress.length > 250) {
      errors.deliveryAddress = 'Delivery address cannot exceed 250 characters'
    }

    const trimmedArea = delivery.deliveryArea.trim()
    if (!trimmedArea) {
      errors.deliveryArea = 'Delivery area or neighborhood is required'
    } else if (trimmedArea.length < 2) {
      errors.deliveryArea = 'Delivery area must be at least 2 characters'
    } else if (trimmedArea.length > 100) {
      errors.deliveryArea = 'Delivery area cannot exceed 100 characters'
    }

    if (delivery.deliveryInstructions && delivery.deliveryInstructions.trim().length > 300) {
      errors.deliveryInstructions = 'Instructions cannot exceed 300 characters'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }, [delivery])

  const handleInputChange = (field: keyof DeliveryInfo, value: string) => {
    setDelivery((prev) => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  // Proceed to Step 2: Fetch authoritative server pricing review
  const handleProceedToReview = async () => {
    if (!isSignedIn) return
    if (!validateDeliveryForm()) return
    if (cartItems.length === 0) {
      setReviewError('Your cart is empty. Please add items before checking out.')
      return
    }

    setIsLoadingReview(true)
    setReviewError(null)
    setPriceChangeWarning(null)

    try {
      const itemsPayload = cartItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
      }))

      const review = await api.reviewOrder(getToken, itemsPayload)
      setServerReview(review)
      setStep('review')
    } catch (err) {
      const error = err as Error & { data?: { error?: string } }
      setReviewError(error.data?.error || error.message || 'Failed to review order pricing')
    } finally {
      setIsLoadingReview(false)
    }
  }

  // Step 2 Submission: submit order with validated server pricing
  const handleSubmitOrder = async () => {
    if (!isSignedIn || !serverReview) return

    setIsSubmitting(true)
    setSubmitError(null)
    setPriceChangeWarning(null)

    try {
      const itemsPayload = cartItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
      }))

      const cleanDelivery: DeliveryInfo = {
        recipientName: delivery.recipientName.trim(),
        phone: delivery.phone.trim(),
        deliveryAddress: delivery.deliveryAddress.trim(),
        deliveryArea: delivery.deliveryArea.trim(),
        deliveryInstructions: delivery.deliveryInstructions?.trim() || '',
      }

      const res = await api.submitOrder(getToken, {
        items: itemsPayload,
        delivery: cleanDelivery,
        reviewedTotalAmount: serverReview.totalAmount,
      })

      // Successfully created on authoritative server!
      setPlacedOrder(res.order)
      setStep('confirmation')

      // Clear cart ONLY after confirmed order creation
      onOrderSuccess(res.order)
    } catch (err: unknown) {
      const error = err as Error & {
        status?: number
        data?: { code?: string; updatedTotal?: number; error?: string }
      }
      if (error.status === 409 && error.data?.code === 'PRICE_CHANGED') {
        // Price changed between review and submit: prompt customer to review updated total
        const updatedTotal = error.data.updatedTotal ?? 0
        setPriceChangeWarning(
          `Price update: One or more item prices changed. Authoritative total is now $${updatedTotal.toFixed(2)}. Please review and re-confirm.`
        )
        // Refresh server review total to match
        if (serverReview && error.data.updatedTotal !== undefined) {
          setServerReview({
            ...serverReview,
            totalAmount: error.data.updatedTotal,
            subtotal: error.data.updatedTotal,
          })
        }
      } else {
        setSubmitError(error.data?.error || error.message || 'Failed to place order. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const totalQuantity = cartItems.reduce((acc, i) => acc + i.quantity, 0)

  return (
    <div
      className="modal-overlay checkout-modal-overlay"
      onClick={!isSubmitting ? handleModalClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
    >
      <div
        className="modal-card checkout-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: step === 'review' ? '640px' : '560px' }}
      >
        {!isSubmitting && (
          <button
            className="modal-close-btn"
            onClick={handleModalClose}
            aria-label="Close checkout modal"
          >
            &#10005;
          </button>
        )}

        {/* STEP 1: DELIVERY & CONTACT FORM */}
        {step === 'form' && (
          <>
            <div className="checkout-modal-header">
              <span className="checkout-step-badge">Step 1 of 2</span>
              <h3 id="checkout-modal-title" className="modal-title">
                Delivery & Contact Info
              </h3>
              <p className="modal-subtitle">
                BiteFlow is delivery-only. Provide your delivery address and contact information below.
              </p>
            </div>

            {/* Authentication Guard */}
            {!isSignedIn ? (
              <div className="checkout-auth-guard">
                <div className="checkout-auth-icon">🔒</div>
                <h4 className="checkout-auth-title">Customer Sign-In Required</h4>
                <p className="checkout-auth-desc">
                  To ensure order security and track payment verification, you must sign in to your BiteFlow customer account before completing checkout.
                </p>
                <div style={{ marginTop: '1.25rem' }}>
                  <SignInButton mode="modal">
                    <button className="auth-pill-btn" style={{ width: '100%', justifyContent: 'center' }}>
                      Sign In or Create Account
                    </button>
                  </SignInButton>
                </div>
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn-text-link"
                    onClick={handleReturnToCart}
                  >
                    ← Return to Cart
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleProceedToReview()
                }}
                noValidate
                className="checkout-form"
              >
                {/* Account status info banner */}
                <div className="checkout-account-banner">
                  <span>Signed in as: <strong>{userEmail || userName || 'Customer'}</strong></span>
                  <span className="verified-badge">✓ Verified</span>
                </div>

                {reviewError && (
                  <div className="checkout-alert checkout-alert-error" role="alert">
                    ⚠️ {reviewError}
                  </div>
                )}

                <div className="form-group-row">
                  <div className="form-group">
                    <label htmlFor="recipientName" className="form-label">
                      Recipient / Customer Name <span className="required-star">*</span>
                    </label>
                    <input
                      id="recipientName"
                      type="text"
                      className={`form-input ${fieldErrors.recipientName ? 'input-error' : ''}`}
                      placeholder="e.g. John Doe"
                      value={delivery.recipientName}
                      maxLength={100}
                      onChange={(e) => handleInputChange('recipientName', e.target.value)}
                      aria-invalid={!!fieldErrors.recipientName}
                      aria-describedby={fieldErrors.recipientName ? 'recipientName-error' : undefined}
                    />
                    {fieldErrors.recipientName && (
                      <span id="recipientName-error" className="field-error-msg">
                        {fieldErrors.recipientName}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone" className="form-label">
                      Contact Phone Number <span className="required-star">*</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      className={`form-input ${fieldErrors.phone ? 'input-error' : ''}`}
                      placeholder="e.g. +1 555-0199 or 9876543210"
                      value={delivery.phone}
                      maxLength={25}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      aria-invalid={!!fieldErrors.phone}
                      aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                    />
                    {fieldErrors.phone && (
                      <span id="phone-error" className="field-error-msg">
                        {fieldErrors.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="deliveryAddress" className="form-label">
                    Delivery Street Address <span className="required-star">*</span>
                  </label>
                  <input
                    id="deliveryAddress"
                    type="text"
                    className={`form-input ${fieldErrors.deliveryAddress ? 'input-error' : ''}`}
                    placeholder="e.g. 124 Main Street, Apt 4B"
                    value={delivery.deliveryAddress}
                    maxLength={250}
                    onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                    aria-invalid={!!fieldErrors.deliveryAddress}
                    aria-describedby={fieldErrors.deliveryAddress ? 'deliveryAddress-error' : undefined}
                  />
                  {fieldErrors.deliveryAddress && (
                    <span id="deliveryAddress-error" className="field-error-msg">
                      {fieldErrors.deliveryAddress}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="deliveryArea" className="form-label">
                    Area / District / Neighborhood <span className="required-star">*</span>
                  </label>
                  <input
                    id="deliveryArea"
                    type="text"
                    className={`form-input ${fieldErrors.deliveryArea ? 'input-error' : ''}`}
                    placeholder="e.g. Downtown, West End, Metro District"
                    value={delivery.deliveryArea}
                    maxLength={100}
                    onChange={(e) => handleInputChange('deliveryArea', e.target.value)}
                    aria-invalid={!!fieldErrors.deliveryArea}
                    aria-describedby={fieldErrors.deliveryArea ? 'deliveryArea-error' : undefined}
                  />
                  {fieldErrors.deliveryArea && (
                    <span id="deliveryArea-error" className="field-error-msg">
                      {fieldErrors.deliveryArea}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="deliveryInstructions" className="form-label">
                    Delivery Instructions <span className="optional-tag">(Optional)</span>
                  </label>
                  <input
                    id="deliveryInstructions"
                    type="text"
                    className={`form-input ${fieldErrors.deliveryInstructions ? 'input-error' : ''}`}
                    placeholder="e.g. Leave at door, gate code 1234, ring bell"
                    value={delivery.deliveryInstructions}
                    maxLength={300}
                    onChange={(e) => handleInputChange('deliveryInstructions', e.target.value)}
                  />
                  {fieldErrors.deliveryInstructions && (
                    <span className="field-error-msg">
                      {fieldErrors.deliveryInstructions}
                    </span>
                  )}
                </div>

                {/* Cart summary preview */}
                <div className="checkout-cart-preview-box">
                  <div className="checkout-summary-row">
                    <span>Items to Order:</span>
                    <strong>{totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}</strong>
                  </div>
                  <div className="checkout-summary-row total-row">
                    <span>Estimated Total:</span>
                    <span className="price-tag">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Closed or paused delivery operational banner */}
                {isClosed ? (
                  <div className="checkout-alert checkout-alert-error" style={{ marginBottom: '1rem' }}>
                    🔴 Orders are currently paused: BiteFlow is closed. Operating hours: {restaurantSettings?.operatingHours || '6:00 AM – 11:30 PM'}.
                  </div>
                ) : isDeliveryPaused ? (
                  <div className="checkout-alert checkout-alert-error" style={{ marginBottom: '1rem' }}>
                    ⚠️ Delivery service is currently inactive. Please check back later.
                  </div>
                ) : null}

                <div className="checkout-modal-actions">
                  <button
                    type="button"
                    className="btn-action btn-back-cart"
                    onClick={handleReturnToCart}
                  >
                    ← Return to Cart
                  </button>
                  <button
                    type="submit"
                    className="btn-action btn-checkout"
                    disabled={isLoadingReview || cartItems.length === 0 || isClosed || isDeliveryPaused}
                  >
                    {isLoadingReview
                      ? 'Verifying with Kitchen...'
                      : isClosed
                      ? 'Kitchen Closed for Orders'
                      : isDeliveryPaused
                      ? 'Delivery Service Inactive'
                      : 'Review Order & Totals →'}
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* STEP 2: REVIEW ORDER & AUTHORITATIVE SERVER PRICING */}
        {step === 'review' && serverReview && (
          <>
            <div className="checkout-modal-header">
              <span className="checkout-step-badge">Step 2 of 2</span>
              <h3 className="modal-title">Review & Confirm Order</h3>
              <p className="modal-subtitle">
                Please verify your delivery information and trusted server-calculated total before submitting.
              </p>
            </div>

            {priceChangeWarning && (
              <div className="checkout-alert checkout-alert-warning" role="alert">
                ⚠️ {priceChangeWarning}
              </div>
            )}

            {submitError && (
              <div className="checkout-alert checkout-alert-error" role="alert">
                ❌ {submitError}
              </div>
            )}

            {/* Delivery Details Summary Box */}
            <div className="checkout-review-delivery-card">
              <div className="review-delivery-header">
                <span className="review-delivery-title">📍 Delivery Details (Delivery-Only)</span>
                <button
                  type="button"
                  className="btn-text-edit"
                  onClick={() => setStep('form')}
                  disabled={isSubmitting}
                >
                  Edit
                </button>
              </div>
              <div className="review-delivery-body">
                <div><strong>Recipient:</strong> {delivery.recipientName} ({delivery.phone})</div>
                <div><strong>Address:</strong> {delivery.deliveryAddress}, {delivery.deliveryArea}</div>
                {delivery.deliveryInstructions && (
                  <div><strong>Notes:</strong> {delivery.deliveryInstructions}</div>
                )}
              </div>
            </div>

            {/* Order Items Table */}
            <div className="checkout-review-items-container">
              <span className="review-items-title">Order Items ({serverReview.items.length})</span>
              <div className="review-items-list">
                {serverReview.items.map((item) => (
                  <div key={item.productId} className="review-item-row">
                    <img
                      src={item.image || '/delicious-burger.jpg'}
                      alt={item.name}
                      className="review-item-img"
                    />
                    <div className="review-item-details">
                      <span className="review-item-name">{item.name}</span>
                      <span className="review-item-meta">
                        {item.quantity} × ${item.unitPrice.toFixed(2)}
                      </span>
                    </div>
                    <span className="review-item-subtotal">
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trusted Server Pricing Totals */}
            <div className="checkout-review-totals-box">
              <div className="checkout-summary-row">
                <span>Items Subtotal:</span>
                <span>${serverReview.subtotal.toFixed(2)}</span>
              </div>
              <div className="checkout-summary-row">
                <span>Delivery Fee:</span>
                <span className="delivery-free-badge">FREE ($0.00)</span>
              </div>
              <div className="checkout-summary-row total-row">
                <span>Authoritative Order Total:</span>
                <span className="price-tag-large">${serverReview.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Manual Payment Verification Notice */}
            <div className="checkout-pending-notice-box">
              <div className="pending-notice-icon">ℹ️</div>
              <div className="pending-notice-text">
                <strong>Manual Payment Verification Required</strong>
                <p>
                  Orders submitted on BiteFlow require payment verification by restaurant admin. After placing your order, payment verification will be pending. Kitchen preparation begins only after an admin verifies your payment.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="checkout-modal-actions">
              <button
                type="button"
                className="btn-action btn-back-cart"
                onClick={() => setStep('form')}
                disabled={isSubmitting}
              >
                ← Back to Details
              </button>
              <button
                type="button"
                className="btn-action btn-checkout"
                disabled={isSubmitting || isClosed || isDeliveryPaused}
                onClick={handleSubmitOrder}
              >
                {isSubmitting
                  ? 'Placing Order...'
                  : isClosed
                  ? 'Kitchen Closed'
                  : isDeliveryPaused
                  ? 'Delivery Inactive'
                  : 'Submit Order for Verification'}
              </button>
            </div>
          </>
        )}

        {/* STEP 3: ORDER CONFIRMATION VIEW */}
        {step === 'confirmation' && placedOrder && (
          <div className="checkout-confirmation-view">
            <div className="confirmation-icon-wrapper">
              <div className="confirmation-success-check">✓</div>
            </div>

            <h3 className="modal-title confirmation-title">Order Submitted Successfully!</h3>
            <p className="modal-subtitle confirmation-subtitle">
              Your order has been recorded and is currently awaiting manual payment verification.
            </p>

            {/* Order Reference Box */}
            <div className="confirmation-details-box">
              <div className="confirmation-row">
                <span className="conf-label">Order Reference:</span>
                <span className="conf-value order-ref-badge">{placedOrder.orderNumber}</span>
              </div>
              <div className="confirmation-row">
                <span className="conf-label">Order Status:</span>
                <span className="conf-value status-badge status-pending">
                  {placedOrder.status}
                </span>
              </div>
              <div className="confirmation-row">
                <span className="conf-label">Payment Verification:</span>
                <span className="conf-value payment-badge payment-pending">
                  PENDING (Awaiting Admin Verification)
                </span>
              </div>
              <div className="confirmation-row">
                <span className="conf-label">Final Server Total:</span>
                <span className="conf-value total-value">${placedOrder.totalAmount.toFixed(2)}</span>
              </div>
              <div className="confirmation-row">
                <span className="conf-label">Deliver to:</span>
                <span className="conf-value address-value">
                  {placedOrder.customerName} — {placedOrder.deliveryAddress}, {placedOrder.deliveryArea} ({placedOrder.customerPhone})
                </span>
              </div>
            </div>

            {/* Explanatory Message */}
            <div className="confirmation-notice">
              <p>
                <strong>Next Steps:</strong> Please note that food preparation will not start until our administration team manually verifies your payment.
              </p>
            </div>

            <div className="confirmation-actions-group" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', width: '100%' }}>
              {onTrackOrder && (
                <button
                  type="button"
                  className="btn-action btn-checkout"
                  style={{ flex: 1, backgroundColor: '#ea580c', borderColor: '#ea580c' }}
                  onClick={() => {
                    const orderToTrack = placedOrder
                    handleModalClose()
                    onTrackOrder(orderToTrack)
                  }}
                >
                  🚚 Track Order Progress
                </button>
              )}
              <button
                type="button"
                className="btn-action btn-back-cart"
                style={{ flex: 1 }}
                onClick={handleModalClose}
              >
                Return to Storefront
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
