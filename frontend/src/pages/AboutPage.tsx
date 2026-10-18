interface AboutPageProps {
  onNavigateToMenu?: () => void
  onNavigateToContact?: () => void
}

export function AboutPage({ onNavigateToMenu, onNavigateToContact }: AboutPageProps) {
  return (
    <div className="about-page-container">
      {/* Top Hero Banner */}
      <section className="about-hero-header">
        <span className="about-hero-sub">About BiteFlow</span>
        <h1 className="about-hero-title">
          About <span className="about-title-accent">Us</span>
        </h1>
        <div className="about-title-divider" aria-hidden="true" />
        <p className="about-hero-subtitle">
          Bridging artisanal culinary passion with cutting-edge kitchen technology.
          Discover what powers our platform and why we are changing the way restaurants and customers connect.
        </p>
      </section>

      {/* Main 2-Column Showcase (Matching Reference Design) */}
      <section className="about-main-section">
        <div className="about-grid">
          {/* Left Column: Visual Showcase */}
          <div className="about-visual-column">
            <div className="about-image-wrapper">
              <img
                src="/chicken-plate.jpg"
                alt="BiteFlow Freshly Prepared Culinary Dish"
                className="about-main-image"
                onError={(e) => {
                  // Fallback to delicious-burger or chef-pizza if needed
                  const target = e.currentTarget
                  if (!target.src.includes('delicious-burger')) {
                    target.src = '/delicious-burger.jpg'
                  }
                }}
              />
              <div className="about-floating-badge">
                <span className="about-badge-icon">⚡</span>
                <div>
                  <strong>Fresh To Order</strong>
                  <span>Cloud Kitchen Fulfillment</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Platform Story & Value Proposition */}
          <div className="about-content-column">
            <span className="about-section-eyebrow">ABOUT OUR PLATFORM</span>
            <h2 className="about-section-heading">
              Smart Kitchen Management &amp; Seamless Food Ordering
            </h2>

            <p className="about-lead-paragraph">
              <strong>BiteFlow</strong> is a next-generation restaurant ordering and kitchen orchestration
              platform built from the ground up for modern dining, dedicated cloud kitchens, and takeaway operations.
              Our mission is to eliminate the friction, high commission fees, and operational disconnect of third-party
              aggregators by connecting culinary creators directly with food lovers.
            </p>

            <p className="about-body-paragraph">
              Whether you are a chef firing orders during peak lunch rush or a customer craving hot, restaurant-grade
              flavors delivered to your door, BiteFlow provides an intuitive, reliable, and real-time ecosystem that
              keeps every order flowing smoothly from the kitchen pan to the final doorstep.
            </p>

            {/* Two Side-by-Side Value Cards: For Restaurants & For Customers */}
            <div className="about-dual-cards">
              {/* For Restaurants */}
              <div className="about-pillar-card">
                <div className="about-pillar-header">
                  <div className="about-pillar-icon-box">👨‍🍳</div>
                  <h3 className="about-pillar-title">How It Helps Restaurants</h3>
                </div>
                <ul className="about-pillar-list">
                  <li>
                    <strong>Real-Time Kitchen Dispatch:</strong> Live order board with instant status updates from preparation to courier handoff.
                  </li>
                  <li>
                    <strong>Protected Payment Verification:</strong> Strict two-stage payment verification prevents fraudulent orders and eliminates chargebacks.
                  </li>
                  <li>
                    <strong>Dynamic Menu &amp; Stock Control:</strong> Instant updates for item availability, pricing, and category organization.
                  </li>
                  <li>
                    <strong>Actionable Sales Analytics:</strong> Comprehensive reports on revenue, top-selling items, and customer feedback.
                  </li>
                </ul>
              </div>

              {/* For Customers */}
              <div className="about-pillar-card">
                <div className="about-pillar-header">
                  <div className="about-pillar-icon-box">🛵</div>
                  <h3 className="about-pillar-title">How It Helps Customers</h3>
                </div>
                <ul className="about-pillar-list">
                  <li>
                    <strong>100% Made-To-Order:</strong> Every dish is freshly prepared upon verified receipt—never pre-made or held under heat lamps.
                  </li>
                  <li>
                    <strong>Live Delivery Tracking:</strong> Transparent status tracker showing order verification, cooking progress, and delivery.
                  </li>
                  <li>
                    <strong>Frictionless Ordering:</strong> Fast, mobile-optimized checkout with support for verified accounts and guest orders.
                  </li>
                  <li>
                    <strong>Direct Kitchen Communication:</strong> Transparent support line and feedback system directly to the restaurant team.
                  </li>
                </ul>
              </div>
            </div>

            {/* Call to Action Buttons */}
            <div className="about-actions-row">
              {onNavigateToMenu && (
                <button
                  type="button"
                  className="about-btn-primary"
                  onClick={onNavigateToMenu}
                >
                  Explore Our Menu
                </button>
              )}
              {onNavigateToContact && (
                <button
                  type="button"
                  className="about-btn-secondary"
                  onClick={onNavigateToContact}
                >
                  Contact Our Team
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Three Core Guarantees Banner */}
      <section className="about-metrics-section">
        <div className="about-metric-card">
          <div className="about-metric-number">01</div>
          <h4 className="about-metric-title">Handcrafted Quality</h4>
          <p className="about-metric-desc">
            Artisanal ingredients, 48-hour fermented pizza dough, and hand-smashed patties prepared to perfection.
          </p>
        </div>

        <div className="about-metric-card">
          <div className="about-metric-number">02</div>
          <h4 className="about-metric-title">Zero Operational Lag</h4>
          <p className="about-metric-desc">
            Real-time web socket sync ensures kitchen staff and couriers receive updates with sub-second latency.
          </p>
        </div>

        <div className="about-metric-card">
          <div className="about-metric-number">03</div>
          <h4 className="about-metric-title">Verified Trust &amp; Safety</h4>
          <p className="about-metric-desc">
            Robust security, clerk-authenticated admin boundaries, and certified payment verification on every transaction.
          </p>
        </div>
      </section>
    </div>
  )
}
