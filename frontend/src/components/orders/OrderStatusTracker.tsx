import type { OrderRecord, OrderStatus } from '../../types/index.js'
import { DeliveryIcon, CheckCircleIcon, AlertTriangleIcon, ClockIcon } from '../common/AdminIcons.js'

interface OrderStatusTrackerProps {
  order: OrderRecord
}

interface StepConfig {
  status: OrderStatus
  label: string
  friendlyDescription: string
  icon: string
}

const ORDER_STEPS: StepConfig[] = [
  {
    status: 'PENDING_PAYMENT',
    label: 'Awaiting Payment',
    friendlyDescription: 'Order submitted; awaiting payment verification.',
    icon: '⏳',
  },
  {
    status: 'CONFIRMED',
    label: 'Order Confirmed',
    friendlyDescription: 'Payment verified; order accepted by kitchen.',
    icon: '🧾',
  },
  {
    status: 'PREPARING',
    label: 'Kitchen Preparing',
    friendlyDescription: 'Chefs are cooking and packing your food.',
    icon: '🍳',
  },
  {
    status: 'READY',
    label: 'Ready for Delivery',
    friendlyDescription: 'Food is packed and waiting for courier pickup.',
    icon: '🛎️',
  },
  {
    status: 'DISPATCHED',
    label: 'Out for Delivery',
    friendlyDescription: 'Courier is on the way to your delivery address.',
    icon: '🚚',
  },
  {
    status: 'DELIVERED',
    label: 'Delivered',
    friendlyDescription: 'Order delivered to recipient. Enjoy your meal!',
    icon: '✅',
  },
]

const STATUS_ORDER: Record<OrderStatus, number> = {
  PENDING_PAYMENT: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  READY: 3,
  DISPATCHED: 4,
  DELIVERED: 5,
}

export function OrderStatusTracker({ order }: OrderStatusTrackerProps) {
  const currentStepIndex = STATUS_ORDER[order.status] ?? 0
  const isPaymentVerified = order.paymentStatus === 'VERIFIED'
  const isPaymentRejected = order.paymentStatus === 'REJECTED'

  // Extract timestamp for each stage from statusHistory or direct fields
  const getStageTimestamp = (status: OrderStatus): string | null => {
    if (order.statusHistory && order.statusHistory.length > 0) {
      const match = order.statusHistory.find((h) => h.newStatus === status)
      if (match?.timestamp) {
        return new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    }

    if (status === 'PENDING_PAYMENT' && order.createdAt) {
      return new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    if (status === 'DISPATCHED' && order.dispatchedAt) {
      return new Date(order.dispatchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    if (status === 'DELIVERED' && order.deliveredAt) {
      return new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    return null
  }

  return (
    <div className="order-tracker-card">
      {/* Payment Security Notice Banner */}
      {isPaymentRejected ? (
        <div className="tracker-payment-banner payment-banner-rejected" role="alert">
          <div className="tracker-banner-icon">
            <AlertTriangleIcon size={22} style={{ color: '#ef4444' }} />
          </div>
          <div className="tracker-banner-content">
            <strong>Payment Verification Failed</strong>
            <p>
              {order.paymentRejectionReason
                ? `Rejection reason: "${order.paymentRejectionReason}"`
                : 'Your payment proof could not be verified by our team.'}
            </p>
            <span className="tracker-banner-subtext">
              Please contact the restaurant kitchen or submit a valid transaction receipt.
            </span>
          </div>
        </div>
      ) : isPaymentVerified ? (
        <div className="tracker-payment-banner payment-banner-verified">
          <div className="tracker-banner-icon">
            <CheckCircleIcon size={22} style={{ color: '#10b981' }} />
          </div>
          <div className="tracker-banner-content">
            <strong>Payment Confirmed &amp; Verified</strong>
            <p>
              Your payment has been successfully verified by restaurant administration.
            </p>
          </div>
        </div>
      ) : (
        <div className="tracker-payment-banner payment-banner-pending">
          <div className="tracker-banner-icon">
            <ClockIcon size={22} style={{ color: '#f59e0b' }} />
          </div>
          <div className="tracker-banner-content">
            <strong>Awaiting Payment Verification (FS-06 Safeguard)</strong>
            <p>
              Our administration team is reviewing your transaction receipt. Kitchen preparation begins immediately upon verification.
            </p>
          </div>
        </div>
      )}

      {/* 6-Step Visual Progress Stepper */}
      <div className="stepper-wrapper" aria-label="Order progress tracker">
        <div className="stepper-track-bar">
          <div
            className="stepper-track-fill"
            style={{
              width: `${(Math.min(currentStepIndex, 5) / 5) * 100}%`,
            }}
          />
        </div>

        <div className="stepper-nodes-row">
          {ORDER_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex
            const isCurrent = idx === currentStepIndex
            const timestamp = getStageTimestamp(step.status)

            return (
              <div
                key={step.status}
                className={`stepper-node-col ${
                  isCompleted ? 'step-completed' : isCurrent ? 'step-current' : 'step-pending'
                }`}
              >
                <div className="stepper-node-circle">
                  {isCompleted ? (
                    <span className="step-check-icon">✓</span>
                  ) : (
                    <span className="step-icon-glyph">{step.icon}</span>
                  )}
                  {isCurrent && <div className="step-pulse-ring" />}
                </div>

                <div className="stepper-node-label">
                  <span className="step-title">{step.label}</span>
                  {timestamp && <span className="step-timestamp">{timestamp}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Step Description Card */}
      <div className="current-status-description-box">
        <div className="current-status-header">
          <span className="status-indicator-dot" />
          <span className="current-status-label">
            Current Status: <strong>{ORDER_STEPS[currentStepIndex]?.label || order.status}</strong>
          </span>
        </div>
        <p className="current-status-text">
          {ORDER_STEPS[currentStepIndex]?.friendlyDescription}
        </p>

        {order.status === 'DISPATCHED' && order.dispatchedAt && (
          <div className="fulfillment-timestamp-notice" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <DeliveryIcon size={16} />
            <span>Dispatched at: {new Date(order.dispatchedAt).toLocaleTimeString()} ({new Date(order.dispatchedAt).toLocaleDateString()})</span>
          </div>
        )}
        {order.status === 'DELIVERED' && order.deliveredAt && (
          <div className="fulfillment-timestamp-notice fulfillment-delivered" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <CheckCircleIcon size={16} />
            <span>Delivered at: {new Date(order.deliveredAt).toLocaleTimeString()} ({new Date(order.deliveredAt).toLocaleDateString()})</span>
          </div>
        )}
      </div>
    </div>
  )
}
