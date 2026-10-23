import { useEffect, useRef } from "react";
import "../../../styles/common/AlertDialog.css";

// =============================================================
// MI ARCUS — branded popup UI used by alertWithGlass.jsx.
// Kept in its own file so React Fast Refresh can reload it.
// =============================================================

// -------------------------------------------------------------
// Artwork
// -------------------------------------------------------------

function CloudLogo() {
    return (
        <svg className="mi-alert-cloud" viewBox="0 0 160 112" aria-hidden="true">
            <defs>
                <linearGradient id="miAlertCloudFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#a985ff" />
                    <stop offset="0.55" stopColor="#7c4dff" />
                    <stop offset="1" stopColor="#5b2fe0" />
                </linearGradient>
                <linearGradient id="miAlertCloudShine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d="M38 100c-18 0-32-13-32-30 0-15 11-27 26-29 3-19 19-33 39-33 15 0 28 8 35 20 3-1 6-1 9-1 18 0 33 14 34 32 7 5 11 12 11 20 0 12-10 21-23 21z"
                fill="url(#miAlertCloudFill)"
                stroke="#ffffff"
                strokeWidth="5"
                strokeLinejoin="round"
            />
            <path
                d="M40 44c3-15 16-26 31-26 9 0 17 4 22 10-24-3-41 4-53 16z"
                fill="url(#miAlertCloudShine)"
            />
            <g transform="translate(86 44)">
                <path d="M0 22A22 22 0 0 1 44 22H37A15 15 0 0 0 7 22Z" fill="#ff6b5a" />
                <path d="M7 22A15 15 0 0 1 37 22H31A9 9 0 0 0 13 22Z" fill="#ffc24b" />
                <path d="M13 22A9 9 0 0 1 31 22H26A4 4 0 0 0 18 22Z" fill="#5fd38d" />
                <path d="M18 22A4 4 0 0 1 26 22Z" fill="#59b8ff" />
            </g>
            <text x="40" y="66" className="mi-alert-cloud-text" fontSize="30">mi</text>
            <text x="30" y="92" className="mi-alert-cloud-text" fontSize="30">arcus</text>
        </svg>
    );
}

function CornerCloud({ side }) {
    return (
        <svg
            className={`mi-alert-puff mi-alert-puff--${side}`}
            viewBox="0 0 200 110"
            aria-hidden="true"
        >
            <path
                d="M14 110c-12 0-18-12-12-22 5-8 14-11 22-9 2-20 19-34 39-32 6-20 25-33 46-30 19 3 33 17 36 35 17-3 33 9 36 25 13 2 21 14 19 27-1 3-2 5-3 6z"
                fill="#ffffff"
                opacity="0.92"
            />
            <path
                d="M40 110c-8 0-12-8-8-15 4-6 10-8 16-6 3-12 14-20 27-18 6-12 19-18 32-14 12 4 19 14 19 26 11 0 20 8 21 18 0 4-1 7-3 9z"
                fill="#e9e1ff"
                opacity="0.85"
            />
        </svg>
    );
}

function TypeIcon({ type }) {
    if (type === "success") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5.5 12.5l4.2 4.2L18.5 7.8" />
            </svg>
        );
    }
    if (type === "error") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 7l10 10M17 7L7 17" />
            </svg>
        );
    }
    if (type === "warning") {
        return (
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 6.5v7" />
                <path d="M12 17.6v.1" />
            </svg>
        );
    }
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 10.5v7" />
            <path d="M12 6.6v.1" />
        </svg>
    );
}

const CONFETTI = [
    ["star", "violet", 14, 30, -14],
    ["star", "blue", 22, 56, 10],
    ["dot", "pink", 30, 18, 0],
    ["diamond", "violet", 40, 70, 20],
    ["star", "green", 26, 78, -8],
    ["dot", "blue", 60, 8, 0],
    ["diamond", "pink", 64, 86, 35],
    ["star", "white", 12, 74, 0],
    ["dot", "violet", 74, 22, 0],
    ["diamond", "green", 70, 12, 15],
    ["star", "white", 50, 92, 0],
    ["dot", "pink", 82, 66, 0],
];

function Confetti() {
    return (
        <div className="mi-alert-confetti" aria-hidden="true">
            {CONFETTI.map(([shape, color, top, left, rotate], index) => (
                <span
                    key={index}
                    className={`mi-alert-bit is-${shape} is-${color}`}
                    style={{
                        top: `${top}%`,
                        left: `${left}%`,
                        "--rot": `${rotate}deg`,
                        "--delay": `${(index % 6) * 0.12}s`,
                    }}
                />
            ))}
        </div>
    );
}

// -------------------------------------------------------------
// Dialog
// -------------------------------------------------------------

function GlassAlertDialog({ message, title, type, okText, onClose }) {
    const okRef = useRef(null);
    const titleId = "mi-alert-title";
    const messageId = "mi-alert-message";

    useEffect(() => {
        const previous = document.activeElement;
        okRef.current?.focus({ preventScroll: true });

        const onKeyDown = (event) => {
            if (event.key === "Escape" || event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                onClose();
                return;
            }
            // Keep keyboard focus inside the popup (two buttons).
            if (event.key === "Tab") {
                const focusable = Array.from(
                    document.querySelectorAll(".mi-alert-dialog button")
                );
                if (!focusable.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };

        window.addEventListener("keydown", onKeyDown, true);
        return () => {
            window.removeEventListener("keydown", onKeyDown, true);
            try {
                previous?.focus?.({ preventScroll: true });
            } catch {
                // ignore
            }
        };
    }, [onClose]);

    return (
        <div
            className="mi-alert-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                className={`mi-alert-dialog is-${type}`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={messageId}
            >
                <div className="mi-alert-badge">
                    <CloudLogo />
                </div>

                <button
                    type="button"
                    className="mi-alert-close"
                    aria-label="Close"
                    onClick={onClose}
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 7l10 10M17 7L7 17" />
                    </svg>
                </button>

                <div className="mi-alert-clip" aria-hidden="true">
                    <CornerCloud side="left" />
                    <CornerCloud side="right" />
                </div>

                <div className="mi-alert-body">
                    <div className="mi-alert-icon-wrap">
                        {type === "success" && <Confetti />}
                        <div className={`mi-alert-icon is-${type}`}>
                            <TypeIcon type={type} />
                        </div>
                    </div>

                    <h2 id={titleId} className="mi-alert-title">
                        {title}
                    </h2>
                    <p id={messageId} className="mi-alert-message">
                        {message}
                    </p>

                    <button
                        ref={okRef}
                        type="button"
                        className="mi-alert-ok"
                        onClick={onClose}
                    >
                        {okText}
                    </button>
                </div>
            </section>
        </div>
    );
}

export default GlassAlertDialog;
