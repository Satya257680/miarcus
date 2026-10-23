import { createRoot } from "react-dom/client";
import GlassAlertDialog from "./GlassAlertDialog";

// =============================================================
// MI ARCUS — BRANDED MESSAGE POPUP (replaces the browser alert)
// -------------------------------------------------------------
// One popup for every module and page: create / update / delete /
// submit / upload confirmations, validation messages and errors.
//
//   success  -> green check  "Success!"   (with confetti)
//   error    -> red cross    "Oops!"
//   warning  -> amber  !     "Attention"
//   info     -> purple i     "Notice"
//
// The type is detected from the message text, so the existing
// alert("…") calls across the app need no changes (see
// utils/installGlassAlert.js). It can also be called directly:
//
//   import { showAlert } from ".../AlertDialog/alertWithGlass";
//   await showAlert("Store saved successfully.");
//   showAlert("Unable to save.", { type: "error" });
//
// Messages are queued and shown one after another.
// =============================================================

const TITLES = {
    success: "Success!",
    error: "Oops!",
    warning: "Attention",
    info: "Notice",
};

const ERROR_RE =
    /\b(fail(ed|ure|s)?|unable|error|cannot|can't|can not|could not|couldn't|invalid|denied|not allowed|not authori[sz]ed|forbidden|expired|wrong|problem|rejected by server|timed? ?out|not (be )?(saved|deleted|updated|created|uploaded|submitted)|(don't|do not|doesn't|does not) have (the )?(permission|access)|no (permission|access)|access denied)\b/i;
const WARNING_RE =
    /^((please|kindly|select|choose|enter|nothing|only|maximum|minimum)\b|no |you (must|need|can only))|\b(there (is|are) no|currently closed|is closed|required|must|mandatory|at least|not found|no (records?|data|rows?|results?|changes?|items?|files?)|already exists?|limited to|too (large|big|many|long)|exceeds?|do(es)? not match|mismatch)\b/i;
const SUCCESS_RE =
    /\b(success(ful(ly)?)?|saved|created|updated|deleted|removed|submitted|approved|rejected|uploaded|imported|exported|sent|verified|added|assigned|completed|copied|restored|reset|activated|deactivated|enabled|disabled|marked|cleared|published|scheduled|registered|done|thank you)\b/i;

/** Decide the popup type from the message text. */
export function detectAlertType(message) {
    const text = String(message ?? "").trim();
    if (!text) return "info";
    if (ERROR_RE.test(text)) return "error";
    if (WARNING_RE.test(text)) return "warning";
    if (SUCCESS_RE.test(text)) return "success";
    return "info";
}

// -------------------------------------------------------------
// Queue + mounting
// -------------------------------------------------------------

const queue = [];
let current = null;
let host = null;
let root = null;

const ensureRoot = () => {
    if (root && host?.isConnected) return root;
    host = document.createElement("div");
    host.className = "mi-alert-root";
    document.body.appendChild(host);
    root = createRoot(host);
    return root;
};

const showNext = () => {
    if (current || queue.length === 0) return;
    current = queue.shift();

    const close = () => {
        const finished = current;
        current = null;
        root?.render(null);
        finished?.resolve();
        // Let the closing frame paint before the next popup.
        window.setTimeout(showNext, 60);
    };

    ensureRoot().render(
        <GlassAlertDialog
            key={current.id}
            message={current.message}
            title={current.title}
            type={current.type}
            okText={current.okText}
            onClose={close}
        />
    );
};

let nextId = 1;

/** Messages still waiting (visible one first) — used to survive reloads. */
export function pendingAlerts() {
    return [current, ...queue]
        .filter(Boolean)
        .map(({ message, type, title }) => ({ message, type, title }));
}

/**
 * Show the branded popup. Resolves when the user closes it.
 * @param {any} message
 * @param {{ type?: "success"|"error"|"warning"|"info", title?: string, okText?: string }} [options]
 */
export function showAlert(message, options = {}) {
    const text =
        message instanceof Error
            ? message.message
            : typeof message === "string"
                ? message
                : message == null
                    ? ""
                    : typeof message === "object"
                        ? (() => {
                            try {
                                return JSON.stringify(message);
                            } catch {
                                return String(message);
                            }
                        })()
                        : String(message);

    const type = options.type || detectAlertType(text);

    return new Promise((resolve) => {
        if (typeof document === "undefined" || !document.body) {
            resolve();
            return;
        }
        queue.push({
            id: nextId++,
            message: text,
            type,
            title: options.title || TITLES[type] || TITLES.info,
            okText: options.okText || "OK",
            resolve,
        });
        showNext();
    });
}

export default showAlert;
