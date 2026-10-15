interface HeroBannerProps {
  onOrderNow: () => void
  onBrowseCategories: () => void
}

export function HeroBanner({ onOrderNow, onBrowseCategories }: HeroBannerProps) {
  return (
    <section className="hero-fullscreen-section hero-video-section">
      {/* Background Video on its own */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="hero-background-video"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
        <source src="/WhatsApp%20Video%202026-10-11%20at%2000.56.27.mp4" type="video/mp4" />
      </video>

      {/* Dark Gradient Overlay for text contrast */}
      <div className="hero-video-gradient-overlay" />

      {/* Hero Content on top */}
      <div className="hero-fullscreen-overlay">
        <div className="hero-content-inner">
          {/* Tag badge with indicator arrow */}
          <div className="hero-live-badge">
            <span className="badge-arrow">◀</span>
            <span className="badge-text">LIVE KITCHEN · ARTISAN WOOD-FIRED PIZZA</span>
          </div>

          {/* Heading: White font + Golden/Amber font */}
          <h1 className="hero-main-heading">
            <span className="heading-white">Fast Food </span>
            <span className="heading-gold">Center</span>
          </h1>

          {/* Subtitle / Description */}
          <p className="hero-main-description">
            Experience the sizzle of handcrafted gourmet burgers, wood-fired artisan pizzas, and
            fresh al dente pasta prepared live with authentic passion.
          </p>

          {/* Action Buttons Row */}
          <div className="hero-actions-row">
            <button className="hero-btn-order" onClick={onOrderNow}>
              Order Now <span className="btn-lightning">⚡</span>
            </button>
            <button className="hero-btn-categories" onClick={onBrowseCategories}>
              Browse Categories
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
