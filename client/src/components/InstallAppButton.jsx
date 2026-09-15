import { useEffect, useRef, useState } from "react";
import {
    FaDownload,
    FaTrashAlt,
    FaShareSquare,
    FaTimes,
    FaCheckCircle,
} from "react-icons/fa";

import useInstallPrompt from "../hooks/useInstallPrompt";
import "./InstallAppButton.css";

// =============================================================
// MIARCUS — INSTALL / UNINSTALL APP BUTTON
// =============================================================
//
// A single reusable component rendered in two places:
//
//   1. variant="sidebar" -> a menu-item styled entry pinned
//      below the sidebar navigation.
//   2. variant="login"   -> a pill styled entry on the login
//      card, above the footer.
//
// It automatically shows the right option for the current state:
//
//   - Not installed  -> "Install App". Triggers the browser's
//     native install prompt (Chrome / Edge / Android) or, where
//     that isn't available (iOS Safari, or any other browser),
//     opens short manual "Add to Home Screen" instructions.
//
//   - Already installed (running standalone) -> "Uninstall App".
//     Browsers don't expose a JS API to trigger an uninstall for
//     security reasons, so this opens short manual instructions
//     tailored to the current platform (desktop / Android / iOS).
//
// Nobody is required to do either — this simply offers the option.
// =============================================================

function InstallAppButton({ variant = "sidebar", collapsed = false }) {
    const {
        canPrompt,
        installed,
        isIOS,
        platform,
        promptInstall,
    } = useInstallPrompt();

    const [showDialog, setShowDialog] = useState(false);
    const [status, setStatus] = useState(null); // "installing" | "declined" | null
    const dialogRef = useRef(null);

    useEffect(() => {
        if (!showDialog) return undefined;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setShowDialog(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        dialogRef.current?.focus();

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [showDialog]);

    const mode = installed ? "uninstall" : "install";

    const handleClick = async () => {
        if (mode === "uninstall") {
            // No browser exposes a programmatic uninstall — always
            // walk the user through the manual steps.
            setShowDialog(true);
            return;
        }

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
        setShowDialog(true);
    };

    const icon = mode === "uninstall" ? <FaTrashAlt /> : <FaDownload />;

    const loginLabel =
        mode === "uninstall"
            ? "Uninstall Miarcus app"
            : status === "installing"
            ? "Opening install prompt…"
            : "Install Miarcus as an app";

    const sidebarLabel =
        mode === "uninstall"
            ? "Uninstall App"
            : status === "installing"
            ? "Opening…"
            : "Install App";

    if (variant === "login") {
        return (
            <>
                <button
                    type="button"
                    className={`install-app-pill ${
                        mode === "uninstall" ? "install-app-pill-uninstall" : ""
                    }`}
                    onClick={handleClick}
                >
                    {icon}
                    <span>{loginLabel}</span>
                </button>

                {showDialog && (
                    <InstructionsDialog
                        mode={mode}
                        isIOS={isIOS}
                        platform={platform}
                        onClose={() => setShowDialog(false)}
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
                } ${mode === "uninstall" ? "install-app-menu-item-uninstall" : ""}`}
                onClick={handleClick}
                title={collapsed ? sidebarLabel : undefined}
            >
                {icon}

                {!collapsed && <span>{sidebarLabel}</span>}
            </button>

            {showDialog && (
                <InstructionsDialog
                    mode={mode}
                    isIOS={isIOS}
                    platform={platform}
                    onClose={() => setShowDialog(false)}
                    dialogRef={dialogRef}
                />
            )}
        </>
    );
}

// =============================================================
// MANUAL INSTRUCTIONS DIALOG
// Covers both install (iOS Safari / unsupported browsers) and
// uninstall (every platform — there's no JS API for it at all).
// =============================================================

function InstructionsDialog({ mode, isIOS, platform, onClose, dialogRef }) {
    const isUninstall = mode === "uninstall";

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
                    {isUninstall
                        ? "Uninstall Miarcus"
                        : "Install Miarcus as an app"}
                </h3>

                {isUninstall ? (
                    <UninstallSteps platform={platform} />
                ) : (
                    <InstallSteps isIOS={isIOS} />
                )}

                <p className="install-instructions-note">
                    <FaCheckCircle />
                    {isUninstall
                        ? " You can always reinstall Miarcus later from the login page or sidebar — your account and data stay safe either way."
                        : " Installing is completely optional — Miarcus keeps working the same way in your browser either way."}
                </p>
            </div>
        </div>
    );
}

function InstallSteps({ isIOS }) {
    if (isIOS) {
        return (
            <ol className="install-instructions-steps">
                <li>
                    Tap the <FaShareSquare className="inline-icon" />{" "}
                    <strong>Share</strong> icon in Safari's toolbar.
                </li>
                <li>
                    Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                    Tap <strong>Add</strong> — Miarcus now opens from your
                    home screen like any other app.
                </li>
            </ol>
        );
    }

    return (
        <ol className="install-instructions-steps">
            <li>
                Open your browser menu (usually <strong>⋮</strong> or{" "}
                <strong>⋯</strong>).
            </li>
            <li>
                Look for <strong>Install app</strong>,{" "}
                <strong>Add to Home screen</strong>, or{" "}
                <strong>Apps → Install this site as an app</strong>.
            </li>
            <li>
                Confirm the install — Miarcus will then open in its own
                window with its own icon.
            </li>
        </ol>
    );
}

function UninstallSteps({ platform }) {
    if (platform === "ios") {
        return (
            <ol className="install-instructions-steps">
                <li>
                    Go to your <strong>Home Screen</strong> and find the
                    Miarcus icon.
                </li>
                <li>
                    Press and hold the icon until it jiggles, then tap the{" "}
                    <strong>✕</strong> or <strong>Remove App</strong>.
                </li>
                <li>
                    Confirm <strong>Delete App</strong> — Miarcus is
                    removed, and the website keeps working normally in
                    Safari.
                </li>
            </ol>
        );
    }

    if (platform === "android") {
        return (
            <ol className="install-instructions-steps">
                <li>
                    Find the Miarcus icon on your home screen or in your app
                    drawer.
                </li>
                <li>
                    Press and hold it, then tap{" "}
                    <strong>Uninstall</strong> (or drag it to{" "}
                    <strong>Uninstall</strong> at the top of the screen).
                </li>
                <li>
                    Confirm — Miarcus is removed from your device.
                </li>
            </ol>
        );
    }

    // Desktop (Chrome / Edge, or unknown).
    return (
        <ol className="install-instructions-steps">
            <li>
                Open the installed Miarcus app window, click the{" "}
                <strong>⋮</strong> menu in its title bar, and choose{" "}
                <strong>Uninstall Miarcus…</strong>
            </li>
            <li>
                Or, in Chrome/Edge, open{" "}
                <strong>chrome://apps</strong> (or{" "}
                <strong>edge://apps</strong>), right-click the Miarcus
                icon, and choose <strong>Remove</strong>.
            </li>
            <li>
                Confirm — Miarcus is removed, and the website keeps
                working normally in your browser.
            </li>
        </ol>
    );
}

export default InstallAppButton;
