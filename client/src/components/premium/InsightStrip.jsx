import { useEffect, useState } from "react";
import axios from "../../axiosConfig.js";
import "../../styles/premium/ChecklistPremium.css";

// ======================================================
// useInsightSummary
// Loads KPI numbers from a /summary endpoint. `refreshKey` should
// change whenever the page reloads its table data so the tiles stay
// in sync with the list below.
// ======================================================
export function useInsightSummary(url, params = {}, refreshKey = null) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const paramsKey = JSON.stringify(params || {});

    useEffect(() => {
        let alive = true;
        setLoading(true);
        axios.get(url, { params: JSON.parse(paramsKey) })
            .then(({ data: res }) => { if (alive) setData(res?.data || null); })
            .catch(() => { if (alive) setData(null); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [url, paramsKey, refreshKey]);

    return { data, loading };
}

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
