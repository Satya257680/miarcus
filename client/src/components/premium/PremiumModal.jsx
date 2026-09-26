import { useEffect } from "react";
import { FaTimes, FaPaperclip, FaExternalLinkAlt } from "react-icons/fa";
import { attachmentName, hasAttachment, openAttachment } from "../../utils/attachments";
import "../../styles/premium/PremiumModal.css";

// ======================================================
// PREMIUM MODAL
// Shared shell for the premium View / Edit dialogs used on
// Checklist Reports and Action Points.
// ======================================================

export default function PremiumModal({
    open = true,
    eyebrow,
    title,
    subtitle,
    icon,
    badges = [],
    onClose,
    footer,
    size = "lg",
    children,
}) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => {
            if (event.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKey);
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = previous;
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="pm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
            <div className={`pm-dialog pm-${size}`} role="dialog" aria-modal="true" aria-label={title}>
                <header className="pm-header">
                    <div className="pm-header-main">
                        {icon && <span className="pm-header-icon">{icon}</span>}
                        <div>
                            {eyebrow && <span className="pm-eyebrow">{eyebrow}</span>}
                            <h3>{title}</h3>
                            {subtitle && <p>{subtitle}</p>}
                        </div>
                    </div>
                    <button type="button" className="pm-close" onClick={onClose} aria-label="Close">
                        <FaTimes />
                    </button>
                    {badges.filter(Boolean).length > 0 && (
                        <div className="pm-badges">
                            {badges.filter(Boolean).map((badge, index) => (
                                <span key={index} className={`pm-badge ${badge.tone || ""}`}>{badge.label}</span>
                            ))}
                        </div>
                    )}
                </header>
                <div className="pm-body">{children}</div>
                {footer && <footer className="pm-footer">{footer}</footer>}
            </div>
        </div>
    );
}

export function PmSection({ title, icon, children, full = false }) {
    return (
        <section className={`pm-section ${full ? "pm-full" : ""}`}>
            {title && (
                <h4 className="pm-section-title">
                    {icon}
                    <span>{title}</span>
                </h4>
            )}
            {children}
        </section>
    );
}

export function PmGrid({ children, cols = 3 }) {
    return <div className={`pm-grid pm-cols-${cols}`}>{children}</div>;
}

export function PmItem({ label, value, wide = false, children }) {
    const display = children ?? (value === null || value === undefined || value === "" ? "-" : value);
    return (
        <div className={`pm-item ${wide ? "pm-wide" : ""}`}>
            <span className="pm-label">{label}</span>
            <div className="pm-value">{display}</div>
        </div>
    );
}

export function PmField({ label, required = false, wide = false, hint, children }) {
    return (
        <label className={`pm-field ${wide ? "pm-wide" : ""}`}>
            <span className="pm-label">
                {label}
                {required && <em>*</em>}
            </span>
            {children}
            {hint && <small className="pm-hint">{hint}</small>}
        </label>
    );
}

export function PmAttachment({ value, emptyText = "No attachment" }) {
    if (!hasAttachment(value)) return <span className="pm-muted">{emptyText}</span>;
    return (
        <button type="button" className="pm-attachment" onClick={() => openAttachment(value)}>
            <FaPaperclip />
            <span>{attachmentName(value)}</span>
            <FaExternalLinkAlt className="pm-attachment-open" />
        </button>
    );
}
