import { SignInButton, UserButton, Show } from '@clerk/react'
import type { UserProfile, RestaurantSettingsData } from '../../types/index.js'
import { ThemeToggle } from '../common/ThemeToggle.js'
import { ClipboardListIcon } from '../common/AdminIcons.js'

export type NavTab = 'home' | 'menu' | 'cart' | 'admin' | 'about' | 'contact' | 'orders'

interface HeaderProps {
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
  onOpenCart?: () => void
  onOpenOrders?: () => void
  userProfile: UserProfile | null
  totalItemCount: number
  restaurantSettings?: RestaurantSettingsData | null
}

export function Header({
  activeTab,
  onTabChange,
  onOpenCart,
  onOpenOrders,
  userProfile,
  totalItemCount,
  restaurantSettings,
}: HeaderProps) {
  const isAuthorizedAdmin = userProfile?.role === 'admin'

  return (
    <header className="site-header">
      {/* Brand logo matching BiteFlow brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <a
          href="/"
          className="header-brand"
          aria-label="BiteFlow Home"
          onClick={(e) => {
            e.preventDefault()
            onTabChange('home')
          }}
        >
          <img
            src="/Bitelogo.png"
            alt="BiteFlow"
            className="header-logo"
          />
        </a>

        {/* Operational Status Pill (if CLOSED or BUSY) */}
        {restaurantSettings?.restaurantStatus === 'CLOSED' ? (
          <span
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.18rem 0.55rem',
              borderRadius: '9999px',
              fontFamily: 'var(--font-nav)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ef4444' }} />
            Closed
          </span>
        ) : restaurantSettings?.restaurantStatus === 'BUSY' ? (
          <span
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.18rem 0.55rem',
              borderRadius: '9999px',
              fontFamily: 'var(--font-nav)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
            High Volume
          </span>
        ) : null}
      </div>

      {/* Center Nav items */}
      <nav className="header-nav" aria-label="Main Navigation">
        <button
          className={`nav-link ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onTabChange('home')}
        >
          HOME
        </button>
        <button
          className={`nav-link ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => onTabChange('menu')}
        >
          MENU
        </button>
        <Show when="signed-in">
          <button
            className={`nav-link ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => onTabChange('orders')}
          >
            MY ORDERS
          </button>
        </Show>
        <button
          className={`nav-link ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => onTabChange('about')}
        >
          ABOUT
        </button>
        <button
          className={`nav-link ${activeTab === 'contact' ? 'active' : ''}`}
          onClick={() => onTabChange('contact')}
        >
          CONTACT
        </button>
      </nav>

      {/* Right Header Actions */}
      <div className="header-actions">
        {/* Light / Dark Mode Toggle */}
        <ThemeToggle />

        {/* Cart Icon with Yellow Badge */}
        <div className="cart-icon-wrapper">
          <button
            className="action-icon-btn"
            aria-label={`View Shopping Cart (${totalItemCount} items)`}
            onClick={(e) => {
              e.preventDefault()
              if (onOpenCart) {
                onOpenCart()
              } else {
                onTabChange('cart')
              }
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          <span className="cart-badge" aria-label={`${totalItemCount} items in cart`}>
            {totalItemCount}
          </span>
        </div>

        {/* Admin Navigation for authorized Admin users only */}
        {isAuthorizedAdmin && (
          <button
            type="button"
            className={`header-admin-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => onTabChange('admin')}
            title="Open dedicated Admin Command Center"
          >
            🛡️ Admin Portal
          </button>
        )}

        {/* User profile / My Account */}
        <Show when="signed-in">
          {onOpenOrders && (
            <button
              type="button"
              className="header-orders-btn"
              onClick={onOpenOrders}
              title="View my placed orders and payment status"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ClipboardListIcon size={14} />
              <span>My Orders</span>
            </button>
          )}
          <div className="header-user-box">
            {userProfile && (
              <span className={`role-badge ${userProfile.role}`} style={{ marginRight: '0.4rem' }}>
                {userProfile.role}
              </span>
            )}
            <span className="user-account-label">My Account</span>
            <UserButton />
          </div>
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="auth-pill-btn">
              Login
            </button>
          </SignInButton>
        </Show>
      </div>
    </header>
  )
}
