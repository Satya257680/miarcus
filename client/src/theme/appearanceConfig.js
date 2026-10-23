// =====================================================================
// MIARCUS — Appearance catalogue (single source of truth)
//
// Every theme / accent / font / layout option offered on
// Settings → Appearance is defined here once and applied to <html> as
// data-attributes + CSS variables that styles/theme.css and
// styles/ThemeModes.css read. Theme ids are the SAME keys that have always
// been stored in the database, so existing user preferences keep working.
// =====================================================================

// mode:   "light" | "dark" | "auto"   (drives day/night text contrast)
// group:  gallery section the card is shown in
// accent: the theme's own accent (used when the accent is "Theme default")
// preview: colours for the miniature app preview card (no CSS classes needed)
export const THEMES = [
    {
        id: "miarcus-original",
        name: "MIARCUS Original",
        description: "The signature MIARCUS purple workspace.",
        icon: "🧸",
        mode: "light",
        group: "light",
        accent: "#6d57c8",
        preview: { bg: "#f2effa", side: "linear-gradient(180deg,#8e81ba,#6d5e8f)", top: "#9a8bc5", card: "#ffffff", line: "#e4ddf3" }
    },
    {
        id: "professional",
        name: "Professional",
        description: "Clean corporate workspace.",
        icon: "💼",
        mode: "light",
        group: "light",
        accent: "#2563eb",
        preview: { bg: "#f4f6f8", side: "#1e293b", top: "#ffffff", card: "#ffffff", line: "#dbe2ea" }
    },
    {
        id: "minimal",
        name: "Minimal",
        description: "Simple, quiet and focused.",
        icon: "🤍",
        mode: "light",
        group: "light",
        accent: "#111827",
        preview: { bg: "#f7f7f7", side: "#eeeeee", top: "#ffffff", card: "#ffffff", line: "#e5e5e5" }
    },
    {
        id: "classic-blue",
        name: "Classic Blue",
        description: "Traditional business software.",
        icon: "🔵",
        mode: "light",
        group: "light",
        accent: "#1d4ed8",
        preview: { bg: "#eff6ff", side: "#1e40af", top: "#dbeafe", card: "#ffffff", line: "#bfdbfe" }
    },
    {
        id: "slate",
        name: "Slate",
        description: "Neutral grey for long work sessions.",
        icon: "🪨",
        mode: "light",
        group: "light",
        accent: "#475569",
        preview: { bg: "#f1f5f9", side: "#334155", top: "#e2e8f0", card: "#ffffff", line: "#e2e8f0" }
    },
    {
        id: "nord",
        name: "Nord",
        description: "Cool arctic blue-grey.",
        icon: "❄️",
        mode: "light",
        group: "light",
        accent: "#5e81ac",
        preview: { bg: "#eceff4", side: "#3b4252", top: "#d8dee9", card: "#ffffff", line: "#d8dee9" }
    },
    {
        id: "ocean",
        name: "Ocean",
        description: "Cool teal and deep-blue workspace.",
        icon: "🌊",
        mode: "light",
        group: "light",
        accent: "#0891b2",
        preview: { bg: "#eefcfc", side: "#075985", top: "#cffafe", card: "#ffffff", line: "#bae6fd" }
    },
    {
        id: "forest",
        name: "Forest",
        description: "Calming green, easy on the eyes.",
        icon: "🌲",
        mode: "light",
        group: "light",
        accent: "#15803d",
        preview: { bg: "#f1f8f0", side: "#14532d", top: "#dcfce7", card: "#ffffff", line: "#d6ecd0" }
    },
    {
        id: "emerald",
        name: "Emerald",
        description: "Fresh jewel green with crisp white.",
        icon: "💚",
        mode: "light",
        group: "light",
        accent: "#059669",
        preview: { bg: "#effbf6", side: "#065f46", top: "#d1fae5", card: "#ffffff", line: "#c9eedd" }
    },
    {
        id: "lavender",
        name: "Lavender",
        description: "Soft violet, light and airy.",
        icon: "💜",
        mode: "light",
        group: "light",
        accent: "#7c3aed",
        preview: { bg: "#f6f3fe", side: "#c9b8f2", top: "#e4dafc", card: "#ffffff", line: "#e6def9" }
    },
    {
        id: "royal",
        name: "Royal",
        description: "Deep plum with a gold accent.",
        icon: "👑",
        mode: "light",
        group: "light",
        accent: "#b8860b",
        preview: { bg: "#f7f3fb", side: "#3b0764", top: "#ede0f5", card: "#ffffff", line: "#e7dcef" }
    },
    {
        id: "rose",
        name: "Rose",
        description: "Soft pink with a friendly feel.",
        icon: "🌹",
        mode: "light",
        group: "light",
        accent: "#db2777",
        preview: { bg: "#fdf2f8", side: "#831843", top: "#fbcfe8", card: "#ffffff", line: "#fbcfe8" }
    },
    {
        id: "cherry",
        name: "Cherry",
        description: "Bold crimson with clean white panels.",
        icon: "🍒",
        mode: "light",
        group: "light",
        accent: "#be123c",
        preview: { bg: "#fff4f5", side: "#881337", top: "#ffe4e9", card: "#ffffff", line: "#fbd5dc" }
    },
    {
        id: "sunset",
        name: "Sunset",
        description: "Warm orange and coral tones.",
        icon: "🌅",
        mode: "light",
        group: "light",
        accent: "#f2542d",
        preview: { bg: "#fff2ea", side: "#7c2d12", top: "#ffe1c7", card: "#ffffff", line: "#ffd9b8" }
    },
    {
        id: "sepia",
        name: "Sepia",
        description: "Warm, paper-like reading tone.",
        icon: "📜",
        mode: "light",
        group: "light",
        accent: "#92400e",
        preview: { bg: "#f4ecd8", side: "#d8c9a3", top: "#efe3c6", card: "#faf3e3", line: "#e2d3ac" }
    },
    {
        id: "coffee",
        name: "Coffee",
        description: "Rich espresso browns, cosy and warm.",
        icon: "☕",
        mode: "light",
        group: "light",
        accent: "#8b5a2b",
        preview: { bg: "#f6efe8", side: "#4a3021", top: "#ecdcc9", card: "#fffaf5", line: "#e8d8c7" }
    },
    {
        id: "neon-glass",
        name: "MIARCUS Neon Glass",
        description: "Deep navy glass with violet, cyan and neon-pink edges.",
        icon: "💎",
        mode: "dark",
        group: "dark",
        accent: "#bd7bff",
        preview: { bg: "linear-gradient(135deg,#080b2a,#10185b 55%,#080d25)", side: "linear-gradient(180deg,#182a70,#111a4c 56%,#05436a)", top: "linear-gradient(90deg,#0f1d53,#2d145b 58%,#0f2a5b)", card: "#1d2a6b", line: "#4f6fd0" }
    },
    {
        id: "dark",
        name: "Dark",
        description: "Comfortable dark workspace.",
        icon: "🌙",
        mode: "dark",
        group: "dark",
        accent: "#8b7cf6",
        preview: { bg: "#0f172a", side: "#020617", top: "#111827", card: "#1f2937", line: "#334155" }
    },
    {
        id: "midnight",
        name: "Midnight",
        description: "Deeper, bluer take on dark mode.",
        icon: "🌌",
        mode: "dark",
        group: "dark",
        accent: "#38bdf8",
        preview: { bg: "#05070f", side: "#000814", top: "#0b1220", card: "#101a30", line: "#1e3a5f" }
    },
    {
        id: "aurora",
        name: "Aurora",
        description: "Dark mode with teal and violet glow.",
        icon: "🌠",
        mode: "dark",
        group: "dark",
        accent: "#2dd4bf",
        preview: { bg: "#0b1020", side: "#0a0f1d", top: "#121a2f", card: "#17213b", line: "#243253" }
    },
    {
        id: "high-contrast",
        name: "High Contrast",
        description: "Strong contrast for visibility.",
        icon: "⚡",
        mode: "dark",
        group: "dark",
        contrast: true,
        accent: "#ffff00",
        preview: { bg: "#000000", side: "#000000", top: "#000000", card: "#000000", line: "#ffffff" }
    },
    {
        id: "auto",
        name: "Auto (System)",
        description: "Follows your device's light / dark setting.",
        icon: "🌗",
        mode: "auto",
        group: "auto",
        accent: "#6d57c8",
        preview: null
    }
];

export const THEME_GROUPS = [
    { id: "light", title: "Light themes", icon: "sun" },
    { id: "dark", title: "Dark & high-contrast", icon: "moon" },
    { id: "auto", title: "Automatic", icon: "auto" }
];

// "Auto" resolves to these concrete themes.
export const AUTO_LIGHT_THEME = "miarcus-original";
export const AUTO_DARK_THEME = "dark";

// "theme" keeps the selected theme's own accent colour.
export const THEME_ACCENT_ID = "theme";

export const ACCENT_COLORS = [
    { id: "purple", name: "Purple", value: "#6d57c8" },
    { id: "blue", name: "Blue", value: "#2563eb" },
    { id: "teal", name: "Teal", value: "#0f766e" },
    { id: "green", name: "Green", value: "#16a34a" },
    { id: "orange", name: "Orange", value: "#ea580c" },
    { id: "red", name: "Red", value: "#dc2626" },
    { id: "pink", name: "Pink", value: "#db2777" },
    { id: "indigo", name: "Indigo", value: "#4f46e5" },
    { id: "amber", name: "Amber", value: "#d97706" },
    { id: "cyan", name: "Cyan", value: "#0891b2" },
    { id: "violet", name: "Violet", value: "#7c3aed" },
    { id: "magenta", name: "Magenta", value: "#c026d3" },
    { id: "lime", name: "Lime", value: "#65a30d" },
    { id: "gold", name: "Gold", value: "#b8860b" },
    { id: "slate", name: "Slate", value: "#475569" }
];

// Only fonts that index.html loads (Plus Jakarta Sans, Quicksand,
// JetBrains Mono) or that every OS ships with are offered.
export const FONT_FAMILIES = [
    {
        id: "default",
        name: "Default",
        sample: "Arial",
        description: "The standard Miarcus typeface.",
        stack: "Arial, 'Helvetica Neue', Helvetica, sans-serif"
    },
    {
        id: "rounded",
        name: "Rounded",
        sample: "Quicksand",
        description: "Friendlier, softer letterforms.",
        stack: "'Quicksand', 'Nunito', 'Varela Round', Arial, sans-serif"
    },
    {
        id: "modern",
        name: "Modern",
        sample: "Plus Jakarta Sans",
        description: "Geometric premium sans.",
        stack: "'Plus Jakarta Sans', 'Poppins', 'Inter', 'Segoe UI', Arial, sans-serif"
    },
    {
        id: "serif",
        name: "Serif",
        sample: "Georgia",
        description: "Classic, print-style lettering.",
        stack: "Georgia, 'Times New Roman', Times, serif"
    },
    {
        id: "mono",
        name: "Monospace",
        sample: "JetBrains Mono",
        description: "Fixed-width, technical look.",
        stack: "'JetBrains Mono', 'Courier New', Courier, monospace"
    },
    {
        id: "system",
        name: "System",
        sample: "System UI",
        description: "Your device's native interface font.",
        stack: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    }
];

export const TEXT_SIZES = [
    { id: "small", name: "Small", scale: 0.92 },
    { id: "medium", name: "Medium", scale: 1 },
    { id: "large", name: "Large", scale: 1.08 }
];

export const SIDEBAR_DENSITIES = [
    { id: "comfortable", name: "Comfortable" },
    { id: "compact", name: "Compact" }
];

export const TABLE_DENSITIES = [
    { id: "comfortable", name: "Comfortable" },
    { id: "compact", name: "Compact" }
];

export const CORNER_STYLES = [
    { id: "rounded", name: "Rounded" },
    { id: "soft", name: "Soft" },
    { id: "sharp", name: "Sharp" }
];

export const MOTION_OPTIONS = [
    { id: "system", name: "Match device" },
    { id: "full", name: "Full" },
    { id: "reduced", name: "Reduced" }
];

// One-click looks that set theme + accent + font together. A preset is
// only a shortcut: applying one writes the same theme / accentColor /
// fontFamily keys the individual controls use (no separate state).
export const PRESETS = [
    { id: "p-original", name: "MIARCUS Classic", description: "The signature purple workspace.", theme: "miarcus-original", accentColor: "purple", fontFamily: "default" },
    { id: "p-neon-glass", name: "MIARCUS Neon Glass", description: "Deep navy glass with neon edges.", theme: "neon-glass", accentColor: "violet", fontFamily: "modern" },
    { id: "p-premium", name: "Premium Violet", description: "Soft lavender with a modern type.", theme: "lavender", accentColor: "violet", fontFamily: "modern" },
    { id: "p-exec", name: "Executive", description: "Royal plum, gold and classic serif.", theme: "royal", accentColor: "gold", fontFamily: "serif" },
    { id: "p-calm", name: "Calm Focus", description: "Low-glare arctic tones for long days.", theme: "nord", accentColor: "blue", fontFamily: "system" },
    { id: "p-night", name: "Night Shift", description: "Dark mode with a teal glow.", theme: "aurora", accentColor: "teal", fontFamily: "modern" },
    { id: "p-fresh", name: "Fresh Retail", description: "Crisp emerald with friendly lettering.", theme: "emerald", accentColor: "green", fontFamily: "rounded" }
];

export const DEFAULT_PREFERENCES = Object.freeze({
    theme: "miarcus-original",
    accentColor: "purple",
    fontSize: "medium",
    fontFamily: "default",
    sidebarStyle: "comfortable",
    tableDensity: "comfortable",
    cornerStyle: "rounded",
    motion: "system"
});

export const PREFERENCE_KEYS = Object.keys(DEFAULT_PREFERENCES);

const ALLOWED = {
    theme: THEMES.map((item) => item.id),
    accentColor: [THEME_ACCENT_ID, ...ACCENT_COLORS.map((item) => item.id)],
    fontSize: TEXT_SIZES.map((item) => item.id),
    fontFamily: FONT_FAMILIES.map((item) => item.id),
    sidebarStyle: SIDEBAR_DENSITIES.map((item) => item.id),
    tableDensity: TABLE_DENSITIES.map((item) => item.id),
    cornerStyle: CORNER_STYLES.map((item) => item.id),
    motion: MOTION_OPTIONS.map((item) => item.id)
};

// Drops unknown keys / values so stale or tampered storage can never
// break the UI. Mirrors server/models/themePreferenceModel.js normalize().
export function normalizePreferences(input) {
    const out = { ...DEFAULT_PREFERENCES };
    if (input && typeof input === "object") {
        for (const key of PREFERENCE_KEYS) {
            if (ALLOWED[key].includes(input[key])) out[key] = input[key];
        }
    }
    return out;
}

export const samePreferences = (a, b) =>
    PREFERENCE_KEYS.every((key) => (a || {})[key] === (b || {})[key]);

export const findTheme = (id) => THEMES.find((item) => item.id === id) || THEMES[0];
export const findAccent = (id) => ACCENT_COLORS.find((item) => item.id === id) || null;
export const findFont = (id) => FONT_FAMILIES.find((item) => item.id === id) || FONT_FAMILIES[0];
export const findPreset = (prefs) =>
    PRESETS.find(
        (preset) =>
            preset.theme === prefs?.theme &&
            preset.accentColor === prefs?.accentColor &&
            preset.fontFamily === prefs?.fontFamily
    ) || null;

// Concrete theme for the current device ("auto" -> light/dark original).
export function resolveTheme(themeId, prefersDark) {
    if (themeId === "auto") {
        return findTheme(prefersDark ? AUTO_DARK_THEME : AUTO_LIGHT_THEME);
    }
    return findTheme(themeId);
}

// Hex accent actually shown for a set of preferences.
export function resolveAccentHex(prefs, prefersDark) {
    if (prefs.accentColor === THEME_ACCENT_ID) {
        return resolveTheme(prefs.theme, prefersDark).accent;
    }
    return findAccent(prefs.accentColor)?.value || THEMES[0].accent;
}

export function accentName(prefs) {
    if (prefs.accentColor === THEME_ACCENT_ID) return "Theme default";
    return findAccent(prefs.accentColor)?.name || "Purple";
}

const hexToRgb = (hex) => {
    const clean = String(hex || "").replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
    const n = parseInt(clean, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const withAlpha = (hex, alpha) => {
    const rgb = hexToRgb(hex);
    return rgb ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})` : hex;
};

// WCAG relative luminance.
const luminance = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const [r, g, b] = rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Text colour to put on an accent-coloured button: whichever of white or
// near-black gives the higher contrast ratio.
export const onAccentColor = (hex) => {
    const l = luminance(hex);
    const withWhite = 1.05 / (l + 0.05);
    const withInk = (l + 0.05) / (0.0062 + 0.05);
    return withWhite >= withInk ? "#ffffff" : "#0b1020";
};

// Pure helper: what a set of preferences resolves to on this device.
export function resolvePreferences(prefs, { prefersDark = false, prefersReducedMotion = false } = {}) {
    const theme = resolveTheme(prefs.theme, prefersDark);
    const motion = prefs.motion === "system"
        ? (prefersReducedMotion ? "reduced" : "full")
        : prefs.motion;
    return {
        theme,
        mode: theme.mode === "dark" ? "dark" : "light",
        accentHex: resolveAccentHex(prefs, prefersDark),
        motion
    };
}

// Writes every data-attribute / CSS variable for a set of preferences.
// Attribute names are the ones theme.css has always used, so existing
// module styles keep working.
export function applyPreferencesToDocument(prefs, env = {}) {
    if (typeof document === "undefined") return null;

    const root = document.documentElement;
    const resolved = resolvePreferences(prefs, env);

    root.dataset.miarcusTheme = resolved.theme.id;
    root.dataset.miarcusThemeChoice = prefs.theme;
    root.dataset.miarcusMode = resolved.mode;
    root.dataset.miarcusContrast = resolved.theme.contrast ? "high" : "normal";
    root.dataset.miarcusFontSize = prefs.fontSize;
    root.dataset.miarcusSidebarStyle = prefs.sidebarStyle;
    root.dataset.miarcusDensity = prefs.tableDensity;
    root.dataset.miarcusRadius = prefs.cornerStyle;
    root.dataset.miarcusMotion = resolved.motion;
    root.dataset.miarcusMotionChoice = prefs.motion;
    root.dataset.miarcusAccent = prefs.accentColor;

    if (prefs.accentColor === THEME_ACCENT_ID) {
        // Let the theme's own --mi-accent from theme.css apply.
        root.style.removeProperty("--mi-accent");
        root.style.removeProperty("--mi-accent-soft");
    } else {
        root.style.setProperty("--mi-accent", resolved.accentHex);
        root.style.setProperty(
            "--mi-accent-soft",
            withAlpha(resolved.accentHex, resolved.mode === "dark" ? 0.22 : 0.13)
        );
    }

    root.style.setProperty("--mi-on-accent", onAccentColor(resolved.accentHex));
    root.style.setProperty("--mi-font-family", findFont(prefs.fontFamily).stack);
    root.dataset.miarcusFont = prefs.fontFamily;
    root.style.colorScheme = resolved.mode;

    return resolved;
}
