import "../../styles/premium/ChecklistPremium.css";

// ======================================================
// InsightStrip
// items: [{ key, label, value, hint, tone, icon: Component, onClick, active }]
// tone: violet | blue | amber | green | red | slate
// ======================================================
export default function InsightStrip({ items = [], loading = false }) {
    return (
        <div className="premium-insights" role="list">
            {items.map(({ key, label, value, hint, tone = "violet", icon: Icon, onClick, active }) => (
                <button
                    type="button"
                    role="listitem"
                    key={key}
                    className={`premium-insight tone-${tone} ${onClick ? "clickable" : ""} ${active ? "active" : ""}`}
                    onClick={onClick}
                    disabled={!onClick}
                >
                    <span className="premium-insight-icon">{Icon ? <Icon /> : null}</span>
                    <span className="premium-insight-copy">
                        <span className="premium-insight-label">{label}</span>
                        <strong className="premium-insight-value">
                            {loading ? <span className="premium-skeleton" /> : (value ?? "–")}
                        </strong>
                        {hint && <span className="premium-insight-hint">{hint}</span>}
                    </span>
                </button>
            ))}
        </div>
    );
}
