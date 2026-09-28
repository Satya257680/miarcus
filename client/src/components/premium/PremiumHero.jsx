import "../../styles/premium/PagePremium.css";

// ======================================================
// PremiumHero
// Gradient page header used by the premium pages.
//
// props:
//   icon      – react-icons component shown in the glass tile
//   eyebrow   – small caps label above the title
//   title     – page title
//   subtitle  – one-line description
//   badge     – optional pill next to the title ("Admin only", "Visible to everyone")
//   badgeTone – "gold" | "mint" | "sky" (default "gold")
//   meta      – [{ label, value }] shown as glass chips under the subtitle
//   actions   – optional node rendered on the right
//   tone      – "violet" (default) | "teal" | "indigo" | "rose"
// ======================================================
export default function PremiumHero({
    icon: Icon,
    eyebrow,
    title,
    subtitle,
    badge,
    badgeTone = "gold",
    meta = [],
    actions = null,
    tone = "violet",
    className = "",
}) {
    const visibleMeta = (meta || []).filter(
        (item) => item && item.value !== undefined && item.value !== null && item.value !== ""
    );

    return (
        <section className={`pp-hero pp-hero--${tone} ${className}`}>
            <span className="pp-hero-orb pp-hero-orb--a" aria-hidden="true" />
            <span className="pp-hero-orb pp-hero-orb--b" aria-hidden="true" />
            <span className="pp-hero-grid" aria-hidden="true" />

            <div className="pp-hero-main">
                {Icon && (
                    <span className="pp-hero-icon" aria-hidden="true">
                        <Icon />
                    </span>
                )}

                <div className="pp-hero-copy">
                    {eyebrow && <span className="pp-hero-eyebrow">{eyebrow}</span>}

                    <div className="pp-hero-title-row">
                        <h1 className="pp-hero-title">{title}</h1>
                        {badge && (
                            <span className={`pp-hero-badge pp-hero-badge--${badgeTone}`}>
                                {badge}
                            </span>
                        )}
                    </div>

                    {subtitle && <p className="pp-hero-subtitle">{subtitle}</p>}

                    {visibleMeta.length > 0 && (
                        <div className="pp-hero-meta">
                            {visibleMeta.map((item) => (
                                <span className="pp-hero-chip" key={item.label}>
                                    <span className="pp-hero-chip-label">{item.label}</span>
                                    <strong className="pp-hero-chip-value">{item.value}</strong>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {actions && <div className="pp-hero-actions">{actions}</div>}
        </section>
    );
}
