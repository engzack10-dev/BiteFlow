import type { SVGProps } from 'react'

/**
 * ============================================================================
 * BITEFLOW TEMPORARY PLACEHOLDER ICONS REGISTRY
 * ============================================================================
 * All icons defined here serve as clean, modular temporary placeholders.
 * When final brand icons or custom illustrated SVGs are provided, simply
 * replace the SVG paths or markup within this file.
 *
 * Each icon supports `size`, `className`, and all standard SVG attributes,
 * inheriting `currentColor` for effortless light/dark theme adaptation.
 * ============================================================================
 */

export interface PlaceholderIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string
  className?: string
}

/** Placeholder: Chef / Restaurant Kitchen Icon */
export function PlaceholderChefIcon({ size = 20, className = '', ...props }: PlaceholderIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`placeholder-icon placeholder-chef-icon ${className}`}
      aria-hidden="true"
      {...props}
    >
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
      <line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  )
}

/** Placeholder: Delivery Scooter / Courier Icon */
export function PlaceholderDeliveryIcon({ size = 20, className = '', ...props }: PlaceholderIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`placeholder-icon placeholder-delivery-icon ${className}`}
      aria-hidden="true"
      {...props}
    >
      <circle cx="18.5" cy="17.5" r="3.5" />
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="15" cy="5" r="1" />
      <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </svg>
  )
}

/** Placeholder: Bolt / Speed / Fresh Badge Icon */
export function PlaceholderBoltIcon({ size = 18, className = '', ...props }: PlaceholderIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`placeholder-icon placeholder-bolt-icon ${className}`}
      aria-hidden="true"
      {...props}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

/** Placeholder: Quality & Craftsmanship Icon */
export function PlaceholderQualityIcon({ size = 20, className = '', ...props }: PlaceholderIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`placeholder-icon placeholder-quality-icon ${className}`}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

/** Placeholder: Zero Operational Lag / Sync Icon */
export function PlaceholderSyncIcon({ size = 20, className = '', ...props }: PlaceholderIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`placeholder-icon placeholder-sync-icon ${className}`}
      aria-hidden="true"
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  )
}

/** Placeholder: Verified Trust & Safety Shield Icon */
export function PlaceholderShieldIcon({ size = 20, className = '', ...props }: PlaceholderIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`placeholder-icon placeholder-shield-icon ${className}`}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

/** Placeholder: Send / Submit Message Icon */
export function PlaceholderSendIcon({ size = 18, className = '', ...props }: PlaceholderIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`placeholder-icon placeholder-send-icon ${className}`}
      aria-hidden="true"
      {...props}
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  )
}

/** Placeholder: Address / Location Pin Icon */
export function PlaceholderLocationIcon({ size = 20, className = '', ...props }: PlaceholderIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`placeholder-icon placeholder-location-icon ${className}`}
      aria-hidden="true"
      {...props}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

/** Placeholder: Phone Call Icon */
export function PlaceholderPhoneIcon({ size = 20, className = '', ...props }: PlaceholderIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`placeholder-icon placeholder-phone-icon ${className}`}
      aria-hidden="true"
      {...props}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

/** Placeholder: Email / Envelope Icon */
export function PlaceholderMailIcon({ size = 20, className = '', ...props }: PlaceholderIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`placeholder-icon placeholder-mail-icon ${className}`}
      aria-hidden="true"
      {...props}
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

/** Placeholder: Working Hours / Clock Icon */
export function PlaceholderClockIcon({ size = 20, className = '', ...props }: PlaceholderIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`placeholder-icon placeholder-clock-icon ${className}`}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
