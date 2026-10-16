import type { RestaurantSettingsData } from '../../types/index.js'
import { PhoneIcon, MailIcon, ClockIcon } from '../common/AdminIcons.js'

interface FooterProps {
  settings?: RestaurantSettingsData | null
  onNavigateToTab?: (tab: 'home' | 'menu' | 'about' | 'contact') => void
}

export function Footer({ settings }: FooterProps) {
  const restaurantName = settings?.restaurantName || 'BiteFlow'
  const phone = settings?.contactPhone || '+252 61 734 3299'
  const email = settings?.contactEmail || 'kitchen@biteflow.com'
  const hours = settings?.operatingHours || '10:00 AM – 10:00 PM'

  return (
    <footer className="feane-footer" role="contentinfo">
      <div className="feane-footer-container">
        {/* Column 1: Contact Us */}
        <div className="feane-footer-col">
          <h3 className="feane-footer-heading">Contact Us</h3>
          <ul className="feane-footer-contact-list">
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>Mogadishu, Banadir, Somalia</span>
            </li>
            <li>
              <a href={`tel:${phone.replace(/\s+/g, '')}`} className="feane-footer-link">
                <PhoneIcon size={16} />
                <span>Call {phone}</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${email}`} className="feane-footer-link">
                <MailIcon size={16} />
                <span>{email}</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Column 2: BiteFlow Brand & Mission */}
        <div className="feane-footer-col feane-footer-col-center">
          <h2 className="feane-footer-brand">{restaurantName}</h2>
          <p className="feane-footer-mission">
            Every dish is freshly crafted to order with premium artisanal ingredients. 
            Delivering hot, restaurant-grade flavor directly to your doorstep with pride and passion.
          </p>
          <div className="feane-footer-socials" aria-label="Social media profiles">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="feane-social-btn" aria-label="Facebook">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="feane-social-btn" aria-label="Twitter">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="feane-social-btn" aria-label="LinkedIn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="feane-social-btn" aria-label="Instagram">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" className="feane-social-btn" aria-label="Pinterest">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.6 19.33c-.05-.8-.1-2.03.02-2.9l.7-2.98s-.18-.36-.18-.89c0-.84.48-1.46 1.09-1.46.51 0 .76.39.76.85 0 .52-.33 1.29-.5 2-.14.61.3 1.1.9 1.1 1.08 0 1.91-1.14 1.91-2.78 0-1.46-1.05-2.47-2.54-2.47-1.73 0-2.75 1.3-2.75 2.64 0 .52.2 1.08.45 1.39.05.06.06.11.04.18l-.17.7c-.03.11-.1.15-.22.1-1-.46-1.62-1.9-1.62-3.07 0-2.5 1.82-4.8 5.24-4.8 2.75 0 4.89 1.96 4.89 4.58 0 2.73-1.72 4.93-4.11 4.93-.8 0-1.56-.42-1.82-.91l-.5 1.9c-.18.7-.67 1.57-1 2.1A10 10 0 1 0 12 2z"/></svg>
            </a>
          </div>
        </div>

        {/* Column 3: Opening Hours */}
        <div className="feane-footer-col">
          <h3 className="feane-footer-heading">Opening Hours</h3>
          <div className="feane-footer-hours-box">
            <span className="feane-hours-day">Everyday</span>
            <span className="feane-hours-time">
              <ClockIcon size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
              {hours}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Bar */}
      <div className="feane-footer-bottom">
        <p className="feane-footer-copyright">
          © {new Date().getFullYear()} All Rights Reserved By <strong>{restaurantName} Restaurant</strong>
        </p>
      </div>
    </footer>
  )
}
