import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";

import axios from "../axiosConfig";

const ThemeContext = createContext(null);

export const THEMES = [
    { id: "miarcus-original", name: "Miarcus Original", description: "The current playful Miarcus look.", icon: "🧸", preview: "original", mode: "light" },
    { id: "professional", name: "Professional", description: "Clean corporate workspace.", icon: "💼", preview: "professional", mode: "light" },
    { id: "dark", name: "Dark", description: "Comfortable dark workspace.", icon: "🌙", preview: "dark", mode: "dark" },
    { id: "minimal", name: "Minimal", description: "Simple, quiet and focused.", icon: "🤍", preview: "minimal", mode: "light" },
    { id: "classic-blue", name: "Classic Blue", description: "Traditional business software.", icon: "🔵", preview: "classic-blue", mode: "light" },
    { id: "high-contrast", name: "High Contrast", description: "Strong contrast for visibility.", icon: "⚡", preview: "high-contrast", mode: "dark" },
    { id: "royal-purple", name: "Royal Purple", description: "Modern premium purple interface.", icon: "💜", preview: "royal-purple", mode: "light" },
    { id: "ocean", name: "Ocean", description: "Fresh blue and teal workspace.", icon: "🌊", preview: "ocean", mode: "light" },
    { id: "emerald", name: "Emerald", description: "Calm green business interface.", icon: "🌿", preview: "emerald", mode: "light" },
    { id: "sunset", name: "Sunset", description: "Warm orange and coral appearance.", icon: "🌅", preview: "sunset", mode: "light" },
    { id: "midnight", name: "Midnight", description: "Deep navy dark workspace.", icon: "🌌", preview: "midnight", mode: "dark" },
    { id: "sky", name: "Sky", description: "Bright, airy blue interface.", icon: "🩵", preview: "sky", mode: "light" }
];

export const ACCENT_COLORS = [
    { id: "purple", name: "Purple", value: "#6d57c8" },
    { id: "blue", name: "Blue", value: "#2563eb" },
    { id: "teal", name: "Teal", value: "#0f766e" },
    { id: "green", name: "Green", value: "#16a34a" },
    { id: "orange", name: "Orange", value: "#ea580c" },
    { id: "red", name: "Red", value: "#dc2626" },
    { id: "pink", name: "Pink", value: "#db2777" },
    { id: "cyan", name: "Cyan", value: "#0891b2" }
];

export const DEFAULT_PREFERENCES = {
    theme: "miarcus-original",
    mode: "light",
    accentColor: "purple",
    fontSize: "medium",
    sidebarStyle: "comfortable",
    layoutMode: "default",
    animations: true,
    rememberPreference: true
};

const VALID_MODES = ["light", "dark"];
const VALID_FONT_SIZES = ["small", "medium", "large"];
const VALID_SIDEBAR_STYLES = ["comfortable", "compact"];
const VALID_LAYOUT_MODES = ["default", "wide"];

const getUserKey = () => {
    const userId = localStorage.getItem("userId");
    if (userId) return `miarcus_theme_preferences_${userId}`;

    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user?.id) return `miarcus_theme_preferences_${user.id}`;
    } catch {}
    return "miarcus_theme_preferences_guest";
};

const readLocalPreferences = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(getUserKey()) || "null");
        return saved && typeof saved === "object"
            ? { ...DEFAULT_PREFERENCES, ...saved }
            : DEFAULT_PREFERENCES;
    } catch {
        return DEFAULT_PREFERENCES;
    }
};

const normalizePreferences = (value = {}) => {
    const themeExists = THEMES.some((item) => item.id === value.theme);
    const accentExists = ACCENT_COLORS.some((item) => item.id === value.accentColor);

    return {
        theme: themeExists ? value.theme : DEFAULT_PREFERENCES.theme,
        mode: VALID_MODES.includes(value.mode) ? value.mode : DEFAULT_PREFERENCES.mode,
        accentColor: accentExists ? value.accentColor : DEFAULT_PREFERENCES.accentColor,
        fontSize: VALID_FONT_SIZES.includes(value.fontSize) ? value.fontSize : DEFAULT_PREFERENCES.fontSize,
        sidebarStyle: VALID_SIDEBAR_STYLES.includes(value.sidebarStyle) ? value.sidebarStyle : DEFAULT_PREFERENCES.sidebarStyle,
        layoutMode: VALID_LAYOUT_MODES.includes(value.layoutMode) ? value.layoutMode : DEFAULT_PREFERENCES.layoutMode,
        animations: typeof value.animations === "boolean" ? value.animations : DEFAULT_PREFERENCES.animations,
        rememberPreference: typeof value.rememberPreference === "boolean" ? value.rememberPreference : DEFAULT_PREFERENCES.rememberPreference
    };
};

function ThemeProvider({ children }) {
    const [preferences, setPreferences] = useState(() => readLocalPreferences());
    const [loadedFromServer, setLoadedFromServer] = useState(false);

    const applyPreferences = useCallback((value) => {
        const normalized = normalizePreferences(value);
        setPreferences(normalized);

        const root = document.documentElement;
        root.dataset.miarcusTheme = normalized.theme;
        root.dataset.miarcusMode = normalized.mode;
        root.dataset.miarcusFontSize = normalized.fontSize;
        root.dataset.miarcusSidebarStyle = normalized.sidebarStyle;
        root.dataset.miarcusLayoutMode = normalized.layoutMode;
        root.dataset.miarcusAnimations = normalized.animations ? "on" : "off";

        const accent = ACCENT_COLORS.find((item) => item.id === normalized.accentColor);
        root.style.setProperty("--mi-accent", accent?.value || "#6d57c8");

        try {
            if (normalized.rememberPreference) {
                localStorage.setItem(getUserKey(), JSON.stringify(normalized));
                localStorage.setItem("miarcus_guest_theme", JSON.stringify(normalized));
            } else {
                localStorage.removeItem(getUserKey());
            }
        } catch {}

        return normalized;
    }, []);

    useEffect(() => {
        applyPreferences(readLocalPreferences());
    }, [applyPreferences]);

    useEffect(() => {
        let cancelled = false;
        const token = localStorage.getItem("token");
        const userId = localStorage.getItem("userId");

        if (!token || !userId) {
            setLoadedFromServer(true);
            return undefined;
        }

        const load = async () => {
            try {
                const response = await axios.get("/api/theme-preferences");
                if (!cancelled && response.data?.success) {
                    applyPreferences(response.data.preferences);
                }
            } catch (error) {
                console.warn("Theme preference load:", error?.message || error);
            } finally {
                if (!cancelled) setLoadedFromServer(true);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [applyPreferences]);

    const updatePreferences = useCallback(async (changes) => {
        const next = applyPreferences({ ...preferences, ...changes });

        const token = localStorage.getItem("token");
        if (!token) return next;

        try {
            const response = await axios.put("/api/theme-preferences", next);
            if (response.data?.success && response.data.preferences) {
                applyPreferences(response.data.preferences);
            }
        } catch (error) {
            console.warn("Theme preference save:", error?.message || error);
        }

        return next;
    }, [applyPreferences, preferences]);

    const toggleMode = useCallback(() => {
        return updatePreferences({
            mode: preferences.mode === "dark" ? "light" : "dark"
        });
    }, [preferences.mode, updatePreferences]);

    const resetPreferences = useCallback(() => {
        return updatePreferences(DEFAULT_PREFERENCES);
    }, [updatePreferences]);

    const value = useMemo(() => ({
        preferences,
        themes: THEMES,
        accentColors: ACCENT_COLORS,
        updatePreferences,
        toggleMode,
        resetPreferences,
        loadedFromServer
    }), [preferences, updatePreferences, toggleMode, resetPreferences, loadedFromServer]);

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used inside ThemeProvider");
    return context;
};

export default ThemeProvider;
