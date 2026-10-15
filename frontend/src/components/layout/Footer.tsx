import type { RestaurantSettingsData } from '../../types/index.js'
import { PhoneIcon, MailIcon, ClockIcon } from '../common/AdminIcons.js'

interface FooterProps {
  settings?: RestaurantSettingsData | null
  onNavigateToTab?: (tab: 'home' | 'menu' | 'about' | 'contact') => void
}

export function Footer({ settings }: FooterProps) {
  const restaurantName = settings?.restaurantName || 'BiteFlow'
  const phone = settings?.contactPhone || '+252-61xxxxxxx'
  const email = settings?.contactEmail || 'kitchen@biteflow.com'
  const hours = settings?.operatingHours || '6:00 AM – 11:30 PM'

  return (
    <footer className="site-footer">
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '1.75rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            fontSize: '0.875rem',
            color: '#cbd5e1',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <PhoneIcon size={14} style={{ color: '#0d9488' }} />
            <span><strong>Hotline:</strong> {phone}</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <MailIcon size={14} style={{ color: '#0d9488' }} />
            <span><strong>Support:</strong> {email}</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <ClockIcon size={14} style={{ color: '#0d9488' }} />
            <span><strong>Hours:</strong> {hours}</span>
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>
          © {new Date().getFullYear()} {restaurantName}. All Rights Reserved. Crafted with care & taste. Delivery-Only Kitchen.
        </p>
      </div>
    </footer>
  )
}
