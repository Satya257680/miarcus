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
    {
        id: "miarcus-original",
        name: "Miarcus Original",
        description: "The current Miarcus look.",
        icon: "🧸",
        preview: "original"
    },
    {
        id: "professional",
        name: "Professional",
        description: "Clean corporate workspace.",
        icon: "💼",
        preview: "professional"
    },
    {
        id: "dark",
        name: "Dark",
        description: "Comfortable dark workspace.",
        icon: "🌙",
        preview: "dark"
    },
    {
        id: "minimal",
        name: "Minimal",
        description: "Simple, quiet and focused.",
        icon: "🤍",
        preview: "minimal"
    },
    {
        id: "classic-blue",
        name: "Classic Blue",
        description: "Traditional business software.",
        icon: "🔵",
        preview: "classic-blue"
    },
    {
        id: "high-contrast",
        name: "High Contrast",
        description: "Strong contrast for visibility.",
        icon: "⚡",
        preview: "high-contrast"
    },
    {
        id: "auto",
        name: "Auto (System)",
        description: "Matches your device's light/dark setting.",
        icon: "🌗",
        preview: "auto"
    },
    {
        id: "sunset",
        name: "Sunset",
        description: "Warm orange and coral tones.",
        icon: "🌅",
        preview: "sunset"
    },
    {
        id: "ocean",
        name: "Ocean",
        description: "Cool teal and deep-blue workspace.",
        icon: "🌊",
        preview: "ocean"
    },
    {
        id: "forest",
        name: "Forest",
        description: "Calming green, easy on the eyes.",
        icon: "🌲",
        preview: "forest"
    },
    {
        id: "rose",
        name: "Rose",
        description: "Soft pink with a friendly feel.",
        icon: "🌹",
        preview: "rose"
    },
    {
        id: "midnight",
        name: "Midnight",
        description: "Deeper, bluer take on dark mode.",
        icon: "🌌",
        preview: "midnight"
    },
    {
        id: "sepia",
        name: "Sepia",
        description: "Warm, paper-like reading tone.",
        icon: "📜",
        preview: "sepia"
    }
];

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
    { id: "cyan", name: "Cyan", value: "#0891b2" }
];

export const FONT_FAMILIES = [
    {
        id: "default",
        name: "Default",
        description: "The standard Miarcus typeface.",
        stack: "Arial, 'Helvetica Neue', Helvetica, sans-serif"
    },
    {
        id: "rounded",
        name: "Rounded",
        description: "Friendlier, softer letterforms.",
        stack: "'Quicksand', 'Varela Round', Arial, sans-serif"
    },
    {
        id: "serif",
        name: "Serif",
        description: "Classic, print-style lettering.",
        stack: "Georgia, 'Times New Roman', Times, serif"
    },
    {
        id: "mono",
        name: "Monospace",
        description: "Fixed-width, technical look.",
        stack: "'JetBrains Mono', 'Courier New', Courier, monospace"
    }
];

// The concrete theme applied to the page when the user picks "Auto" -
// resolved from the device's own light/dark setting.
const resolveSystemTheme = () => {
    try {
        return window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "miarcus-original";
    } catch {
        return "miarcus-original";
    }
};

const DEFAULT_PREFERENCES = {
    theme: "miarcus-original",
    accentColor: "purple",
    fontSize: "medium",
    fontFamily: "default",
    sidebarStyle: "comfortable"
};

const VALID_FONT_SIZES = ["small", "medium", "large"];
const VALID_FONT_FAMILIES = FONT_FAMILIES.map((item) => item.id);
const VALID_SIDEBAR_STYLES = ["comfortable", "compact"];

const getUserKey = () => {
    const userId = localStorage.getItem("userId");

    if (userId) {
        return `miarcus_theme_preferences_${userId}`;
    }

    const user = JSON.parse(
        localStorage.getItem("user") || "{}"
    );

    return user?.id
        ? `miarcus_theme_preferences_${user.id}`
        : "miarcus_theme_preferences_guest";
};

const readLocalPreferences = () => {
    try {
        const saved = JSON.parse(
            localStorage.getItem(getUserKey()) || "null"
        );

        if (!saved || typeof saved !== "object") {
            return DEFAULT_PREFERENCES;
        }

        return {
            ...DEFAULT_PREFERENCES,
            ...saved
        };
    } catch {
        return DEFAULT_PREFERENCES;
    }
};

const normalizePreferences = (value = {}) => {
    const themeExists = THEMES.some(
        (theme) => theme.id === value.theme
    );

    const accentExists = ACCENT_COLORS.some(
        (accent) => accent.id === value.accentColor
    );

    return {
        theme: themeExists
            ? value.theme
            : DEFAULT_PREFERENCES.theme,

        accentColor: accentExists
            ? value.accentColor
            : DEFAULT_PREFERENCES.accentColor,

        fontSize: VALID_FONT_SIZES.includes(
            value.fontSize
        )
            ? value.fontSize
            : DEFAULT_PREFERENCES.fontSize,

        fontFamily: VALID_FONT_FAMILIES.includes(
            value.fontFamily
        )
            ? value.fontFamily
            : DEFAULT_PREFERENCES.fontFamily,

        sidebarStyle: VALID_SIDEBAR_STYLES.includes(
            value.sidebarStyle
        )
            ? value.sidebarStyle
            : DEFAULT_PREFERENCES.sidebarStyle
    };
};

function ThemeProvider({ children }) {
    const [preferences, setPreferences] = useState(
        () => readLocalPreferences()
    );

    const [loadedFromServer, setLoadedFromServer] =
        useState(false);

    const applyPreferences = useCallback(
        (value) => {
            const normalized =
                normalizePreferences(value);

            setPreferences(normalized);

            const root =
                document.documentElement;

            // "Auto" isn't a real color palette - it just follows the
            // device's light/dark setting, so resolve it to a concrete
            // theme before writing the attribute the CSS keys off of.
            root.dataset.miarcusTheme =
                normalized.theme === "auto"
                    ? resolveSystemTheme()
                    : normalized.theme;

            root.dataset.miarcusThemeChoice =
                normalized.theme;

            root.dataset.miarcusFontSize =
                normalized.fontSize;

            root.dataset.miarcusSidebarStyle =
                normalized.sidebarStyle;

            const accent =
                ACCENT_COLORS.find(
                    (item) =>
                        item.id ===
                        normalized.accentColor
                );

            root.style.setProperty(
                "--mi-accent",
                accent?.value ||
                    "#6d57c8"
            );

            const font =
                FONT_FAMILIES.find(
                    (item) =>
                        item.id ===
                        normalized.fontFamily
                );

            root.style.setProperty(
                "--mi-font-family",
                font?.stack ||
                    FONT_FAMILIES[0].stack
            );

            try {
                localStorage.setItem(
                    getUserKey(),
                    JSON.stringify(normalized)
                );
            } catch {
                // Keep the UI working if storage is unavailable.
            }

            return normalized;
        },
        []
    );

    // --------------------------------------------------
    // Apply immediately from local storage.
    // --------------------------------------------------

    useEffect(() => {
        applyPreferences(
            readLocalPreferences()
        );
    }, [applyPreferences]);

    // --------------------------------------------------
    // Keep "Auto" in sync if the device's light/dark
    // setting changes while the app is open.
    // --------------------------------------------------

    useEffect(() => {
        if (
            preferences.theme !== "auto" ||
            !window.matchMedia
        ) {
            return undefined;
        }

        const media = window.matchMedia(
            "(prefers-color-scheme: dark)"
        );

        const handleChange = () => {
            document.documentElement.dataset.miarcusTheme =
                resolveSystemTheme();
        };

        if (media.addEventListener) {
            media.addEventListener(
                "change",
                handleChange
            );

            return () =>
                media.removeEventListener(
                    "change",
                    handleChange
                );
        }

        // Safari < 14 fallback.
        media.addListener(handleChange);

        return () =>
            media.removeListener(handleChange);
    }, [preferences.theme]);

    // --------------------------------------------------
    // Load the authenticated user's saved preference.
    // --------------------------------------------------

    useEffect(() => {
        let cancelled = false;

        const token =
            localStorage.getItem("token");

        const userId =
            localStorage.getItem("userId");

        if (!token || !userId) {
            setLoadedFromServer(true);
            return undefined;
        }

        const load = async () => {
            try {
                const response =
                    await axios.get(
                        "/api/theme-preferences"
                    );

                if (
                    !cancelled &&
                    response.data?.success
                ) {
                    applyPreferences(
                        response.data.preferences
                    );
                }
            } catch (error) {
                // Local preference remains active if the
                // server is temporarily unavailable.
                console.warn(
                    "Theme preference load:",
                    error?.message || error
                );
            } finally {
                if (!cancelled) {
                    setLoadedFromServer(true);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [applyPreferences]);

    const updatePreferences = useCallback(
        async (changes) => {
            const next =
                applyPreferences({
                    ...preferences,
                    ...changes
                });

            const token =
                localStorage.getItem("token");

            if (!token) {
                return next;
            }

            try {
                const response =
                    await axios.put(
                        "/api/theme-preferences",
                        next
                    );

                if (
                    response.data?.success &&
                    response.data.preferences
                ) {
                    applyPreferences(
                        response.data.preferences
                    );
                }
            } catch (error) {
                console.warn(
                    "Theme preference save:",
                    error?.message || error
                );
            }

            return next;
        },
        [applyPreferences, preferences]
    );

    const value = useMemo(
        () => ({
            preferences,
            themes: THEMES,
            accentColors: ACCENT_COLORS,
            fontFamilies: FONT_FAMILIES,
            updatePreferences,
            loadedFromServer
        }),
        [
            preferences,
            updatePreferences,
            loadedFromServer
        ]
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(
        ThemeContext
    );

    if (!context) {
        throw new Error(
            "useTheme must be used inside ThemeProvider"
        );
    }

    return context;
};

export default ThemeProvider;
