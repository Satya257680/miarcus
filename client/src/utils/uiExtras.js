// ---------------------------------------------------------
// Per-device interface extras (corners, motion, table density).
// These are browser-local conveniences, so they live in
// localStorage only and never block the page if storage fails.
// ---------------------------------------------------------
export const UI_EXTRAS_KEY = "miarcus_ui_extras_v1";

export const DEFAULT_UI_EXTRAS = {
    radius: "rounded",
    motion: "full",
    density: "comfortable"
};

export const readUiExtras = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(UI_EXTRAS_KEY) || "null");
        return { ...DEFAULT_UI_EXTRAS, ...(saved && typeof saved === "object" ? saved : {}) };
    } catch {
        return DEFAULT_UI_EXTRAS;
    }
};

export const applyUiExtras = (extras = readUiExtras()) => {
    const root = document.documentElement;
    root.dataset.miarcusRadius = extras.radius;
    root.dataset.miarcusMotion = extras.motion;
    root.dataset.miarcusDensity = extras.density;
    try {
        localStorage.setItem(UI_EXTRAS_KEY, JSON.stringify(extras));
    } catch {
        // Storage unavailable - the choice still applies to this visit.
    }
    return extras;
};
