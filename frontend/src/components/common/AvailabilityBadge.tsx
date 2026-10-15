interface AvailabilityBadgeProps {
  isAvailable: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function AvailabilityBadge({
  isAvailable,
  className = '',
  size = 'md',
}: AvailabilityBadgeProps) {
  const statusClass = isAvailable ? 'badge-available' : 'badge-sold-out'
  const sizeClass = `badge-${size}`

  return (
    <span
      className={`availability-badge ${statusClass} ${sizeClass} ${className}`.trim()}
      role="status"
      aria-label={isAvailable ? 'Item is available' : 'Item is sold out'}
    >
      <span className="badge-dot" aria-hidden="true" />
      {isAvailable ? 'In Stock' : 'Sold Out'}
    </span>
  )
}
