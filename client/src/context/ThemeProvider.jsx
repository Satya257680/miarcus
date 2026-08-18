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
    }
];

export const ACCENT_COLORS = [
    { id: "purple", name: "Purple", value: "#6d57c8" },
    { id: "blue", name: "Blue", value: "#2563eb" },
    { id: "teal", name: "Teal", value: "#0f766e" },
    { id: "green", name: "Green", value: "#16a34a" },
    { id: "orange", name: "Orange", value: "#ea580c" },
    { id: "red", name: "Red", value: "#dc2626" }
];

const DEFAULT_PREFERENCES = {
    theme: "miarcus-original",
    accentColor: "purple",
    fontSize: "medium",
    sidebarStyle: "comfortable"
};

const VALID_FONT_SIZES = ["small", "medium", "large"];
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

            root.dataset.miarcusTheme =
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
