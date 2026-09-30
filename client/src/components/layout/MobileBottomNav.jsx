import { NavLink } from "react-router-dom";
import {
    FaHome,
    FaImages,
    FaClipboardCheck,
    FaCalendarCheck,
    FaChartBar,
    FaBullhorn,
    FaEllipsisH,
} from "react-icons/fa";

import { canAccessPage } from "../../utils/rbac";
import { useRbacVersion } from "../../hooks/usePermission";

// ======================================================
// MobileBottomNav
// App-style bottom tab bar shown ONLY on phones
// (Layout renders it when the viewport is ≤ 768px).
// Tabs respect the user's RBAC access — any tab the user
// cannot open is skipped and the next allowed one is used.
// "More" opens the full sidebar as a slide-in drawer.
// ======================================================

const CANDIDATE_TABS = [
    { key: "dashboard.home", to: "/dashboard", label: "Dashboard", icon: FaHome },
    { key: "gallery.library", to: "/gallery", label: "Gallery", icon: FaImages },
    { key: "checklist.submit", to: "/checklist-submit", label: "Checklist", icon: FaClipboardCheck },
    { key: "attendance.mark", to: "/attendance", label: "Attendance", icon: FaCalendarCheck },
    { key: "checklist.reports", to: "/checklist-reports", label: "Reports", icon: FaChartBar },
    { key: "announcements.list", to: "/announcements", label: "News", icon: FaBullhorn },
];

const MAX_TABS = 4;

export default function MobileBottomNav({ onMore, menuOpen = false }) {
    // Re-render when permissions are refreshed
    useRbacVersion();

    const tabs = CANDIDATE_TABS
        .filter((tab) => {
            try {
                return canAccessPage(tab.key);
            } catch {
                return false;
            }
        })
        .slice(0, MAX_TABS);

    return (
        <nav className="mobile-bottom-nav" aria-label="Primary">
            {tabs.map(({ key, to, label, icon: Icon }) => (
                <NavLink
                    key={key}
                    to={to}
                    className={({ isActive }) =>
                        `mbn-item ${isActive && !menuOpen ? "active" : ""}`
                    }
                >
                    <span className="mbn-icon">
                        <Icon />
                    </span>
                    <span className="mbn-label">{label}</span>
                </NavLink>
            ))}

            <button
                type="button"
                className={`mbn-item ${menuOpen ? "active" : ""}`}
                onClick={onMore}
                aria-expanded={menuOpen}
                aria-label="More menu"
            >
                <span className="mbn-icon">
                    <FaEllipsisH />
                </span>
                <span className="mbn-label">More</span>
            </button>
        </nav>
    );
}
