// Unit tests for the appearance catalogue. Run with:  npm test  (node --test)
import { test } from "node:test";
import assert from "node:assert/strict";

import {
    THEMES,
    ACCENT_COLORS,
    FONT_FAMILIES,
    PRESETS,
    DEFAULT_PREFERENCES,
    THEME_ACCENT_ID,
    normalizePreferences,
    samePreferences,
    findPreset,
    resolvePreferences,
    applyPreferencesToDocument,
    onAccentColor
} from "./appearanceConfig.js";

// Theme ids are stored in the database; renaming one would silently reset
// every user who chose it.
const STORED_THEME_IDS = [
    "miarcus-original", "professional", "minimal", "classic-blue", "slate", "nord",
    "ocean", "forest", "emerald", "lavender", "royal", "rose", "cherry", "sunset",
    "sepia", "coffee", "neon-glass", "dark", "midnight", "aurora", "high-contrast", "auto"
];

test("every stored theme id still exists", () => {
    const ids = THEMES.map((theme) => theme.id);
    for (const id of STORED_THEME_IDS) assert.ok(ids.includes(id), `missing theme ${id}`);
});

test("presets only use valid theme / accent / font ids and are unique", () => {
    const seen = new Set();
    for (const preset of PRESETS) {
        assert.ok(THEMES.some((t) => t.id === preset.theme), preset.id);
        assert.ok(ACCENT_COLORS.some((a) => a.id === preset.accentColor), preset.id);
        assert.ok(FONT_FAMILIES.some((f) => f.id === preset.fontFamily), preset.id);
        assert.ok(preset.description, `${preset.id} needs a description`);
        const key = `${preset.theme}|${preset.accentColor}|${preset.fontFamily}`;
        assert.ok(!seen.has(key), `duplicate preset combination ${key}`);
        seen.add(key);
    }
});

test("applying a preset sets theme, accent and font together and is detected", () => {
    const preset = PRESETS.find((p) => p.id === "p-exec");
    const next = normalizePreferences({ ...DEFAULT_PREFERENCES, fontSize: "large", ...preset });
    assert.equal(next.theme, "royal");
    assert.equal(next.accentColor, "gold");
    assert.equal(next.fontFamily, "serif");
    assert.equal(next.fontSize, "large", "other preferences are kept");
    assert.equal(findPreset(next)?.id, "p-exec");
    assert.equal(findPreset({ ...next, accentColor: "blue" }), null, "custom combination");
});

test("normalizePreferences drops unknown keys and values", () => {
    const next = normalizePreferences({ theme: "nope", accentColor: "teal", motion: "warp", extra: 1 });
    assert.equal(next.theme, DEFAULT_PREFERENCES.theme);
    assert.equal(next.accentColor, "teal");
    assert.equal(next.motion, DEFAULT_PREFERENCES.motion);
    assert.ok(!("extra" in next));
    assert.ok(samePreferences(normalizePreferences(null), DEFAULT_PREFERENCES));
});

test("auto theme and match-device motion follow the device", () => {
    const prefs = normalizePreferences({ theme: "auto", motion: "system" });
    assert.equal(resolvePreferences(prefs, { prefersDark: true }).mode, "dark");
    assert.equal(resolvePreferences(prefs, { prefersDark: false }).mode, "light");
    assert.equal(resolvePreferences(prefs, { prefersReducedMotion: true }).motion, "reduced");
    assert.equal(resolvePreferences(prefs, { prefersReducedMotion: false }).motion, "full");
});

test("theme default accent uses the theme's own colour", () => {
    const prefs = normalizePreferences({ theme: "high-contrast", accentColor: THEME_ACCENT_ID });
    assert.equal(resolvePreferences(prefs).accentHex, "#ffff00");
});

test("text on accent buttons keeps readable contrast", () => {
    assert.equal(onAccentColor("#ffff00"), "#0b1020");
    assert.equal(onAccentColor("#6d57c8"), "#ffffff");
});

test("applyPreferencesToDocument writes the data attributes the CSS reads", () => {
    const style = new Map();
    globalThis.document = {
        documentElement: {
            dataset: {},
            style: {
                setProperty: (k, v) => style.set(k, v),
                removeProperty: (k) => style.delete(k),
                colorScheme: ""
            }
        }
    };
    try {
        const prefs = normalizePreferences({ theme: "dark", accentColor: "teal", fontSize: "small", cornerStyle: "sharp", tableDensity: "compact" });
        applyPreferencesToDocument(prefs, {});
        const root = globalThis.document.documentElement;
        assert.equal(root.dataset.miarcusTheme, "dark");
        assert.equal(root.dataset.miarcusMode, "dark");
        assert.equal(root.dataset.miarcusFontSize, "small");
        assert.equal(root.dataset.miarcusRadius, "sharp");
        assert.equal(root.dataset.miarcusDensity, "compact");
        assert.equal(style.get("--mi-accent"), "#0f766e");
        assert.equal(root.style.colorScheme, "dark");

        applyPreferencesToDocument(normalizePreferences({ theme: "dark", accentColor: THEME_ACCENT_ID }), {});
        assert.ok(!style.has("--mi-accent"), "theme default removes the accent override");
    } finally {
        delete globalThis.document;
    }
});
