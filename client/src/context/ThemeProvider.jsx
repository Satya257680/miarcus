import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState
} from "react";

import axios from "../axiosConfig";
import {
    THEMES,
    ACCENT_COLORS,
    FONT_FAMILIES,
    DEFAULT_PREFERENCES,
    AUTO_LIGHT_THEME,
    AUTO_DARK_THEME,
    normalizePreferences,
    samePreferences,
    resolvePreferences,
    applyPreferencesToDocument,
    findTheme
} from "../theme/appearanceConfig";
import { readLegacyUiExtras, clearLegacyUiExtras } from "../utils/uiExtras";
import runAfterCommit from "../utils/runAfterCommit";
import { ThemeContext } from "./themeContext";

// ---------------------------------------------------------------------
// MIARCUS appearance state
//
//   personal  - the signed-in user's own saved default (server, per user)
//   global    - the organisation appearance an administrator published:
//                 mode "off"      -> not used
//                 mode "default"  -> used by anyone without a personal default
//                 mode "enforced" -> used by every non-admin user (locked)
//   draft     - unsaved changes being previewed on the Appearance page
//
// What is on screen = draft ?? effective(personal, global).
// Nothing is written to the server until the user presses
// "Save as my default" (or an admin presses "Save for all users").
// The topbar day/night switch is a deliberate one-click choice and is
// saved to the user's own default straight away.
// ---------------------------------------------------------------------


const LAST_LIGHT_KEY = "miarcus_last_light_theme";
const LAST_DARK_KEY = "miarcus_last_dark_theme";

const OFF_GLOBAL = {
    enabled: false,
    allowPersonal: true,
    mode: "off",
    preferences: DEFAULT_PREFERENCES
};

const safeGet = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
};
const safeSet = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
};

const readStoredUser = () => {
    try { return JSON.parse(safeGet("user") || "{}") || {}; } catch { return {}; }
};

const getUserKey = () => {
    const userId = safeGet("userId");
    if (userId) return `miarcus_theme_preferences_${userId}`;
    const user = readStoredUser();
    return user?.id
        ? `miarcus_theme_preferences_${user.id}`
        : "miarcus_theme_preferences_guest";
};

// Last appearance shown to this user - only used for a flicker-free first
// paint; the server copy always wins once it loads.
const readCachedPreferences = () => {
    try {
        const saved = JSON.parse(safeGet(getUserKey()) || "null");
        return saved && typeof saved === "object" ? normalizePreferences(saved) : DEFAULT_PREFERENCES;
    } catch {
        return DEFAULT_PREFERENCES;
    }
};

const isAdminUser = () => {
    const user = readStoredUser();
    return Number(user?.is_admin ?? user?.isAdmin ?? 0) === 1 ||
        user?.is_admin === true || user?.isAdmin === true;
};

const normalizeGlobal = (value) => {
    if (!value || typeof value !== "object" || !value.enabled) {
        return { ...OFF_GLOBAL, preferences: normalizePreferences(value?.preferences) };
    }
    // Older servers did not send allowPersonal - their global theme was enforced.
    const allowPersonal = value.allowPersonal === true;
    return {
        enabled: true,
        allowPersonal,
        mode: allowPersonal ? "default" : "enforced",
        preferences: normalizePreferences(value.preferences)
    };
};

// Which saved appearance applies to this user, and why.
const resolveEffective = ({ personal, global, isAdmin }) => {
    if (global.mode === "enforced" && !isAdmin) {
        return { preferences: global.preferences, source: "enforced" };
    }
    if (personal.isCustom) {
        return { preferences: personal.preferences, source: "personal" };
    }
    if (global.mode === "default" || global.mode === "enforced") {
        return { preferences: global.preferences, source: "organisation" };
    }
    return { preferences: DEFAULT_PREFERENCES, source: "built-in" };
};

const errorMessage = (error, fallback) =>
    error?.response?.data?.message || error?.message || fallback;

const useMediaQuery = (query) => {
    const read = () => {
        try { return Boolean(window.matchMedia && window.matchMedia(query).matches); }
        catch { return false; }
    };
    const [matches, setMatches] = useState(read);

    useEffect(() => {
        if (!window.matchMedia) return undefined;
        const media = window.matchMedia(query);
        const onChange = () => setMatches(media.matches);
        if (media.addEventListener) {
            media.addEventListener("change", onChange);
            return () => media.removeEventListener("change", onChange);
        }
        media.addListener(onChange); // Safari < 14
        return () => media.removeListener(onChange);
    }, [query]);

    return matches;
};

function ThemeProvider({ children }) {
    const [isAdmin, setIsAdmin] = useState(isAdminUser);
    const [personal, setPersonal] = useState(() => ({
        preferences: readCachedPreferences(),
        // Until the server answers, treat the cached look as the user's own.
        isCustom: true
    }));
    const [globalTheme, setGlobalTheme] = useState(OFF_GLOBAL);
    const [draft, setDraft] = useState(null);
    const [loadedFromServer, setLoadedFromServer] = useState(false);

    const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
    const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

    const effective = useMemo(
        () => resolveEffective({ personal, global: globalTheme, isAdmin }),
        [personal, globalTheme, isAdmin]
    );
    const locked = globalTheme.mode === "enforced" && !isAdmin;
    // An enforced organisation appearance always wins over an unsaved preview.
    const activeDraft = locked ? null : draft;
    const preferences = activeDraft || effective.preferences;
    const isDirty = Boolean(activeDraft) && !samePreferences(activeDraft, effective.preferences);

    const resolved = useMemo(
        () => resolvePreferences(preferences, { prefersDark, prefersReducedMotion }),
        [preferences, prefersDark, prefersReducedMotion]
    );

    // Apply before paint so a theme change never flashes unreadable text.
    useLayoutEffect(() => {
        applyPreferencesToDocument(preferences, { prefersDark, prefersReducedMotion });
    }, [preferences, prefersDark, prefersReducedMotion]);

    // Cache the saved (not draft) appearance for the next first paint.
    useEffect(() => {
        safeSet(getUserKey(), JSON.stringify(effective.preferences));
    }, [effective.preferences]);

    // Remember the last light and dark theme so the topbar switch can
    // return the user to the exact look they had before.
    useEffect(() => {
        if (preferences.theme === "auto") return;
        const theme = findTheme(preferences.theme);
        safeSet(theme.mode === "dark" ? LAST_DARK_KEY : LAST_LIGHT_KEY, theme.id);
    }, [preferences.theme]);

    // -----------------------------------------------------------------
    // Load personal + organisation appearance from the server.
    // -----------------------------------------------------------------
    const migratedRef = useRef(false);

    const refreshGlobalTheme = useCallback(async () => {
        const hasToken = Boolean(safeGet("token"));
        const results = await (hasToken
            ? Promise.allSettled([
                axios.get("/api/theme-preferences/global"),
                axios.get("/api/theme-preferences")
            ])
            : Promise.resolve(null));

        // All state updates happen after the request settles.
        setIsAdmin(isAdminUser());

        if (!results) {
            setLoadedFromServer(true);
            return null;
        }

        const [globalResult, personalResult] = results;

        let nextGlobal = null;
        if (globalResult.status === "fulfilled" && globalResult.value.data?.success !== false) {
            nextGlobal = normalizeGlobal(globalResult.value.data?.globalTheme);
            setGlobalTheme((current) =>
                current.mode === nextGlobal.mode &&
                samePreferences(current.preferences, nextGlobal.preferences)
                    ? current
                    : nextGlobal
            );
        } else if (globalResult.status === "rejected") {
            // Keep the current appearance usable if the server is unavailable.
            console.warn("Global theme load:", globalResult.reason?.message || globalResult.reason);
        }

        if (personalResult.status === "fulfilled" && personalResult.value.data?.success) {
            const data = personalResult.value.data;
            const nextPersonal = {
                preferences: normalizePreferences(data.preferences),
                // Older servers did not send isCustom; they always returned a row.
                isCustom: data.isCustom !== false
            };

            // One-time move of the old device-only "Interface" options
            // (corners, motion, table spacing) into the saved account default.
            if (!migratedRef.current) {
                migratedRef.current = true;
                const legacy = readLegacyUiExtras();
                const enforcedForMe = nextGlobal?.mode === "enforced" && !isAdminUser();
                if (legacy && nextPersonal.isCustom && !enforcedForMe) {
                    const merged = normalizePreferences({ ...nextPersonal.preferences, ...legacy });
                    if (!samePreferences(merged, nextPersonal.preferences)) {
                        try {
                            const response = await axios.put("/api/theme-preferences", merged);
                            if (response.data?.success) {
                                nextPersonal.preferences = normalizePreferences(response.data.preferences || merged);
                            }
                        } catch {
                            // Not critical - the user can save again from Appearance.
                        }
                    }
                }
                if (legacy) clearLegacyUiExtras();
            }

            setPersonal((current) =>
                current.isCustom === nextPersonal.isCustom &&
                samePreferences(current.preferences, nextPersonal.preferences)
                    ? current
                    : nextPersonal
            );
        } else if (personalResult.status === "rejected") {
            console.warn("Personal theme load:", personalResult.reason?.message || personalResult.reason);
        }

        setLoadedFromServer(true);
        return nextGlobal;
    }, []);

    useEffect(() => runAfterCommit(() => {
        refreshGlobalTheme();

        // Pick up an administrator's change when the user returns to the tab.
        const onFocus = () => refreshGlobalTheme();
        const poll = window.setInterval(() => {
            if (document.visibilityState === "visible") refreshGlobalTheme();
        }, 60000);
        window.addEventListener("focus", onFocus);
        return () => {
            window.clearInterval(poll);
            window.removeEventListener("focus", onFocus);
        };
    }), [refreshGlobalTheme]);

    // -----------------------------------------------------------------
    // Preview (draft) - nothing is saved yet.
    // -----------------------------------------------------------------
    const previewPreferences = useCallback((changes) => {
        if (locked) return false;
        setDraft((current) =>
            normalizePreferences({ ...(current || effective.preferences), ...changes })
        );
        return true;
    }, [locked, effective.preferences]);

    const discardPreview = useCallback(() => setDraft(null), []);

    // -----------------------------------------------------------------
    // Save as my default (personal, per user).
    // -----------------------------------------------------------------
    const savePersonal = useCallback(async (value) => {
        const next = normalizePreferences(value || draft || effective.preferences);

        if (!safeGet("token")) {
            setPersonal({ preferences: next, isCustom: true });
            setDraft(null);
            return { ok: true, preferences: next, localOnly: true };
        }

        try {
            const response = await axios.put("/api/theme-preferences", next);
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Could not save your appearance.");
            }
            const saved = normalizePreferences(response.data.preferences || next);
            setPersonal({ preferences: saved, isCustom: true });
            setDraft((current) => (current && samePreferences(current, next) ? null : current));
            return { ok: true, preferences: saved };
        } catch (error) {
            return { ok: false, error: errorMessage(error, "Could not save your appearance. Please try again.") };
        }
    }, [draft, effective.preferences]);

    // -----------------------------------------------------------------
    // Reset my appearance: forget my own default.
    // -----------------------------------------------------------------
    const resetPersonal = useCallback(async () => {
        if (!safeGet("token")) {
            setPersonal({ preferences: DEFAULT_PREFERENCES, isCustom: false });
            setDraft(null);
            return { ok: true };
        }
        try {
            const response = await axios.delete("/api/theme-preferences");
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Could not reset your appearance.");
            }
            setPersonal({ preferences: DEFAULT_PREFERENCES, isCustom: false });
            setDraft(null);
            return { ok: true };
        } catch (error) {
            return { ok: false, error: errorMessage(error, "Could not reset your appearance. Please try again.") };
        }
    }, []);

    // -----------------------------------------------------------------
    // Administrators: organisation-wide appearance.
    //   mode "default"  -> everyone without their own saved default
    //   mode "enforced" -> every non-admin user, personal choices locked
    // -----------------------------------------------------------------
    const saveGlobalTheme = useCallback(async ({ mode = "default", preferences: value, alsoSaveForMe = false } = {}) => {
        const next = normalizePreferences(value || draft || effective.preferences);
        try {
            const response = await axios.put("/api/theme-preferences/global", {
                enabled: true,
                allowPersonal: mode !== "enforced",
                preferences: next
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Could not apply the appearance to all users.");
            }
            setGlobalTheme(normalizeGlobal(response.data.globalTheme || {
                enabled: true,
                allowPersonal: mode !== "enforced",
                preferences: next
            }));

            if (alsoSaveForMe) {
                const mine = await savePersonal(next);
                if (!mine.ok) {
                    return { ok: true, warning: `Saved for all users, but your own default was not updated: ${mine.error}` };
                }
            }
            return { ok: true };
        } catch (error) {
            return { ok: false, error: errorMessage(error, "Could not apply the appearance to all users.") };
        }
    }, [draft, effective.preferences, savePersonal]);

    const disableGlobalTheme = useCallback(async () => {
        try {
            const response = await axios.put("/api/theme-preferences/global", {
                enabled: false,
                allowPersonal: true,
                preferences: globalTheme.preferences
            });
            if (!response.data?.success) {
                throw new Error(response.data?.message || "Could not turn off the organisation appearance.");
            }
            setGlobalTheme(OFF_GLOBAL);
            return { ok: true };
        } catch (error) {
            return { ok: false, error: errorMessage(error, "Could not turn off the organisation appearance.") };
        }
    }, [globalTheme.preferences]);

    // -----------------------------------------------------------------
    // Topbar day / night switch.
    // -----------------------------------------------------------------
    const nextDayNightTheme = useCallback(() => {
        if (resolved.mode === "dark") {
            const last = safeGet(LAST_LIGHT_KEY);
            return last && findTheme(last).id === last && findTheme(last).mode === "light" ? last : AUTO_LIGHT_THEME;
        }
        const last = safeGet(LAST_DARK_KEY);
        return last && findTheme(last).id === last && findTheme(last).mode === "dark" ? last : AUTO_DARK_THEME;
    }, [resolved.mode]);

    const toggleDayNight = useCallback(async () => {
        if (locked) return { ok: false, error: "Appearance is managed by your administrator." };
        const theme = nextDayNightTheme();
        // Keep any unsaved preview, but switch its theme too.
        setDraft((current) => (current ? normalizePreferences({ ...current, theme }) : current));
        return savePersonal({ ...effective.preferences, theme });
    }, [locked, nextDayNightTheme, savePersonal, effective.preferences]);

    // Backward-compatible API: apply a change and save it straight away.
    const updatePreferences = useCallback(async (changes) => {
        if (locked) return globalTheme.preferences;
        const next = normalizePreferences({ ...preferences, ...changes });
        setDraft(next);
        const result = await savePersonal(next);
        return result.ok ? result.preferences : next;
    }, [locked, globalTheme.preferences, preferences, savePersonal]);

    const value = useMemo(
        () => ({
            // what is on screen right now (draft or saved)
            preferences,
            resolvedTheme: resolved.theme,
            mode: resolved.mode,
            accentHex: resolved.accentHex,
            prefersDark,
            prefersReducedMotion,
            // saved state
            savedPreferences: effective.preferences,
            source: effective.source,
            personal,
            globalTheme,
            isAdmin,
            locked,
            isDirty,
            loadedFromServer,
            // catalogue (kept for existing callers)
            themes: THEMES,
            accentColors: ACCENT_COLORS,
            fontFamilies: FONT_FAMILIES,
            // actions
            previewPreferences,
            discardPreview,
            savePersonal,
            resetPersonal,
            saveGlobalTheme,
            disableGlobalTheme,
            toggleDayNight,
            updatePreferences,
            refreshGlobalTheme
        }),
        [
            preferences, resolved, prefersDark, prefersReducedMotion, effective, personal, globalTheme,
            isAdmin, locked, isDirty, loadedFromServer, previewPreferences,
            discardPreview, savePersonal, resetPersonal, saveGlobalTheme,
            disableGlobalTheme, toggleDayNight, updatePreferences, refreshGlobalTheme
        ]
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export default ThemeProvider;
