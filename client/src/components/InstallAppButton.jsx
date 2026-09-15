import { useEffect, useRef, useState } from "react";
import { FaDownload, FaShareSquare, FaTimes, FaCheckCircle } from "react-icons/fa";

import useInstallPrompt from "../hooks/useInstallPrompt";
import "./InstallAppButton.css";

// =============================================================
// MIARCUS — INSTALL APP BUTTON
// =============================================================
//
// A single reusable component rendered in two places:
//
//   1. variant="sidebar" -> a menu-item styled entry pinned
//      below the sidebar navigation.
//   2. variant="login"   -> a pill styled entry on the login
//      card, above the footer.
//
// Nobody is required to install anything — this simply offers
// the option. Clicking it either triggers the browser's native
// install prompt (Chrome / Edge / Android) or, where that isn't
// available (iOS Safari, or any other browser), opens a short
// set of manual "Add to Home Screen" instructions.
// =============================================================

function InstallAppButton({ variant = "sidebar", collapsed = false }) {
    const {
        canPrompt,
        installed,
        isIOS,
        promptInstall,
    } = useInstallPrompt();

    const [showInstructions, setShowInstructions] = useState(false);
    const [status, setStatus] = useState(null); // "installing" | "declined" | null
    const dialogRef = useRef(null);

    useEffect(() => {
        if (!showInstructions) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setShowInstructions(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        dialogRef.current?.focus();

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [showInstructions]);

    // Already installed / already running as a standalone app —
    // nothing to offer, so render nothing.
    if (installed) {
        return null;
    }

    const handleClick = async () => {
        if (canPrompt) {
            setStatus("installing");
            const outcome = await promptInstall();
            setStatus(outcome === "accepted" ? null : "declined");

            if (outcome !== "accepted") {
                window.setTimeout(() => setStatus(null), 2500);
            }

            return;
        }

        // No native prompt — walk the user through it manually.
        setShowInstructions(true);
    };

    const label = "Install App";

    if (variant === "login") {
        return (
            <>
                <button
                    type="button"
                    className="install-app-pill"
                    onClick={handleClick}
                >
                    <FaDownload />
                    <span>
                        {status === "installing"
                            ? "Opening install prompt…"
                            : "Install Miarcus as an app"}
                    </span>
                </button>

                {showInstructions && (
                    <InstructionsDialog
                        isIOS={isIOS}
                        onClose={() => setShowInstructions(false)}
                        dialogRef={dialogRef}
                    />
                )}
            </>
        );
    }

    // variant === "sidebar"
    return (
        <>
            <button
                type="button"
                className={`menu-item install-app-menu-item ${
                    status === "declined" ? "install-declined" : ""
                }`}
                onClick={handleClick}
                title={collapsed ? label : undefined}
            >
                <FaDownload />

                {!collapsed && (
                    <span>
                        {status === "installing"
                            ? "Opening…"
                            : label}
                    </span>
                )}
            </button>

            {showInstructions && (
                <InstructionsDialog
                    isIOS={isIOS}
                    onClose={() => setShowInstructions(false)}
                    dialogRef={dialogRef}
                />
            )}
        </>
    );
}

// =============================================================
// MANUAL INSTALL INSTRUCTIONS (iOS Safari / unsupported browsers)
// =============================================================

function InstructionsDialog({ isIOS, onClose, dialogRef }) {
    return (
        <div
            className="install-instructions-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                className="install-instructions-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="install-instructions-title"
                tabIndex={-1}
                ref={dialogRef}
            >
                <button
                    type="button"
                    className="install-instructions-close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <FaTimes />
                </button>

                <h3 id="install-instructions-title">
                    Install Miarcus as an app
                </h3>

                {isIOS ? (
                    <ol className="install-instructions-steps">
                        <li>
                            Tap the <FaShareSquare className="inline-icon" />{" "}
                            <strong>Share</strong> icon in Safari's toolbar.
                        </li>
                        <li>
                            Scroll down and tap{" "}
                            <strong>Add to Home Screen</strong>.
                        </li>
                        <li>
                            Tap <strong>Add</strong> — Miarcus now opens
                            from your home screen like any other app.
                        </li>
                    </ol>
                ) : (
                    <ol className="install-instructions-steps">
                        <li>
                            Open your browser menu (usually{" "}
                            <strong>⋮</strong> or <strong>⋯</strong>).
                        </li>
                        <li>
                            Look for <strong>Install app</strong>,{" "}
                            <strong>Add to Home screen</strong>, or{" "}
                            <strong>Apps → Install this site as an app</strong>.
                        </li>
                        <li>
                            Confirm the install — Miarcus will then open
                            in its own window with its own icon.
                        </li>
                    </ol>
                )}

                <p className="install-instructions-note">
                    <FaCheckCircle /> Installing is completely optional —
                    Miarcus keeps working the same way in your browser
                    either way.
                </p>
            </div>
        </div>
    );
}

export default InstallAppButton;
