// ---------------------------------------------------------
// LEGACY per-device interface extras (corners, motion, table density).
//
// These options are now part of the user's saved appearance
// (Settings → Appearance → "Save as my default"), stored on the server
// with every other appearance preference. This file only reads the old
// browser-local value once so ThemeProvider can move it into the
// account, then clears it. The original exports are kept so any older
// import keeps working.
// ---------------------------------------------------------
export const UI_EXTRAS_KEY = "miarcus_ui_extras_v1";

export const DEFAULT_UI_EXTRAS = {
    radius: "rounded",
    motion: "full",
    density: "comfortable"
};

const RADIUS = ["rounded", "soft", "sharp"];
const MOTION = ["full", "reduced"];
const DENSITY = ["comfortable", "compact"];

export const readUiExtras = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(UI_EXTRAS_KEY) || "null");
        return { ...DEFAULT_UI_EXTRAS, ...(saved && typeof saved === "object" ? saved : {}) };
    } catch {
        return DEFAULT_UI_EXTRAS;
    }
};

// Returns the old device-only values mapped to the new preference keys,
// or null when nothing was stored on this device.
export const readLegacyUiExtras = () => {
    let saved;
    try {
        saved = JSON.parse(localStorage.getItem(UI_EXTRAS_KEY) || "null");
    } catch {
        return null;
    }
    if (!saved || typeof saved !== "object") return null;

    const mapped = {};
    if (RADIUS.includes(saved.radius)) mapped.cornerStyle = saved.radius;
    // "full" was the old default, which now means "Match device".
    if (saved.motion === "reduced") mapped.motion = "reduced";
    if (DENSITY.includes(saved.density)) mapped.tableDensity = saved.density;
    return mapped;
};

export const clearLegacyUiExtras = () => {
    try {
        localStorage.removeItem(UI_EXTRAS_KEY);
    } catch {
        // Storage unavailable - nothing to clear.
    }
};

// Kept for compatibility: applies the attributes without storing them.
export const applyUiExtras = (extras = readUiExtras()) => {
    const root = document.documentElement;
    if (RADIUS.includes(extras.radius)) root.dataset.miarcusRadius = extras.radius;
    if (MOTION.includes(extras.motion)) root.dataset.miarcusMotion = extras.motion;
    if (DENSITY.includes(extras.density)) root.dataset.miarcusDensity = extras.density;
    return extras;
};