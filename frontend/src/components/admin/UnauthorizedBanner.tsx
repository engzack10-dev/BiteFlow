import { Show, SignInButton } from '@clerk/react'

interface UnauthorizedBannerProps {
  adminError: string
  userRole?: string
  onReturnToCart: () => void
  onRetry?: () => void
}

export function UnauthorizedBanner({
  adminError,
  userRole,
  onReturnToCart,
  onRetry,
}: UnauthorizedBannerProps) {
  const isNetworkError =
    adminError.toLowerCase().includes('failed to fetch') ||
    adminError.toLowerCase().includes('network') ||
    adminError.toLowerCase().includes('connect') ||
    adminError.toLowerCase().includes('err_connection_refused')

  if (isNetworkError) {
    return (
      <div className="unauthorized-banner">
        <div className="unauthorized-icon">⚠️</div>
        <h2 className="unauthorized-title" style={{ color: '#b45309' }}>
          Unable to Connect to Server
        </h2>
        <p className="unauthorized-desc">
          Could not connect to the BiteFlow backend API at{' '}
          <code>http://localhost:5000</code>.
          <br />
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Please make sure the backend server is running, then try again.
          </span>
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {onRetry && (
            <button className="btn-action btn-update" onClick={onRetry}>
              ↻ Retry Connection
            </button>
          )}
          <button className="btn-action btn-continue" onClick={onReturnToCart}>
            Return to Shopping Cart
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="unauthorized-banner">
      <div className="unauthorized-icon">🚫</div>
      <h2 className="unauthorized-title">403 Forbidden: Access Denied</h2>
      <p className="unauthorized-desc">
        {adminError}
        <br />
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Server-side verification strictly rejected this request. Your verified role is{' '}
          <strong>{userRole || 'Unauthenticated'}</strong>.
        </span>
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button className="btn-action btn-continue" onClick={onReturnToCart}>
          Return to Shopping Cart
        </button>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="btn-action btn-update">
              Sign In as Admin
            </button>
          </SignInButton>
        </Show>
      </div>
    </div>
  )
}
