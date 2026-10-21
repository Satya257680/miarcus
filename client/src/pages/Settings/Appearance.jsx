import { useEffect, useId, useState } from "react";
import {
    FaAdjust,
    FaCheck,
    FaColumns,
    FaCrown,
    FaFont,
    FaInfoCircle,
    FaLock,
    FaMagic,
    FaMoon,
    FaPalette,
    FaSave,
    FaSlidersH,
    FaSun,
    FaSwatchbook,
    FaTextHeight,
    FaUndo,
    FaUsers
} from "react-icons/fa";

import { useTheme } from "../../context/ThemeProvider";
import {
    THEMES,
    THEME_GROUPS,
    ACCENT_COLORS,
    FONT_FAMILIES,
    TEXT_SIZES,
    SIDEBAR_DENSITIES,
    TABLE_DENSITIES,
    CORNER_STYLES,
    MOTION_OPTIONS,
    PRESETS,
    THEME_ACCENT_ID,
    AUTO_LIGHT_THEME,
    AUTO_DARK_THEME,
    findTheme,
    findFont,
    findPreset,
    accentName
} from "../../theme/appearanceConfig";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import PremiumHero from "../../components/premium/PremiumHero";

import "../../styles/premium/PagePremium.css";
import "../../styles/premium/AdminPagesPremium.css";
import "../../styles/pages/Appearance.css";

// ---------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------

function Section({ icon: Icon, title, description, aside, children, id }) {
    const headingId = `${id}-title`;
    return (
        <section className="appearance-section" aria-labelledby={headingId}>
            <div className="appearance-section-header">
                <div className="ap-head">
                    <span className="ap-head-icon" aria-hidden="true"><Icon /></span>
                    <div>
                        <h2 id={headingId}>{title}</h2>
                        {description && <p>{description}</p>}
                    </div>
                </div>
                {aside}
            </div>
            {children}
        </section>
    );
}

// Single-choice control with radio-group semantics.
function Segmented({ label, options, value, onChange, disabled }) {
    return (
        <div className="ap-segmented" role="radiogroup" aria-label={label}>
            {options.map((option) => {
                const selected = value === option.id;
                return (
                    <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`ap-seg${selected ? " is-on" : ""}`}
                        onClick={() => onChange(option.id)}
                        disabled={disabled}
                    >
                        {option.name}
                        {selected && <FaCheck aria-hidden="true" />}
                    </button>
                );
            })}
        </div>
    );
}

// Preview colours are passed as CSS custom properties (not inline
// "background") so no theme skin can repaint the miniature previews.
function MiniUi({ palette, accent }) {
    return (
        <span
            className="ap-mini"
            style={{
                "--ap-bg": palette.bg,
                "--ap-side": palette.side,
                "--ap-top": palette.top,
                "--ap-tile": palette.card,
                "--ap-line": palette.line,
                "--ap-dot": accent
            }}
        >
            <span className="ap-mini-side">
                <i />
                <i />
                <i />
            </span>
            <span className="ap-mini-body">
                <span className="ap-mini-top" />
                <span className="ap-mini-tiles">
                    <span />
                    <span />
                    <span />
                </span>
                <span className="ap-mini-chart" />
            </span>
        </span>
    );
}

function ThemePreview({ theme, accent }) {
    if (theme.mode === "auto") {
        const light = findTheme(AUTO_LIGHT_THEME);
        const dark = findTheme(AUTO_DARK_THEME);
        return (
            <span className="ap-preview ap-preview--split" aria-hidden="true">
                <MiniUi palette={light.preview} accent={accent || light.accent} />
                <MiniUi palette={dark.preview} accent={accent || dark.accent} />
            </span>
        );
    }
    return (
        <span className="ap-preview" aria-hidden="true">
            <MiniUi palette={theme.preview} accent={accent || theme.accent} />
        </span>
    );
}

const GROUP_ICONS = { sun: FaSun, moon: FaMoon, auto: FaAdjust };

const SOURCE_LABEL = {
    personal: "Your saved default",
    organisation: "Organisation default",
    "built-in": "MIARCUS default",
    enforced: "Set by administrator"
};

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

function Appearance() {
    const {
        preferences,
        source,
        personal,
        globalTheme,
        isAdmin,
        locked,
        isDirty,
        mode,
        prefersDark,
        previewPreferences,
        discardPreview,
        savePersonal,
        resetPersonal,
        saveGlobalTheme,
        disableGlobalTheme
    } = useTheme();

    const uid = useId();
    const [busy, setBusy] = useState("");
    const [notice, setNotice] = useState(null); // { tone, text }
    const [confirmReset, setConfirmReset] = useState(false);
    const [orgDialog, setOrgDialog] = useState(false);
    const [orgMode, setOrgMode] = useState("default");
    const [alsoForMe, setAlsoForMe] = useState(true);
    const [confirmDisable, setConfirmDisable] = useState(false);

    // Unsaved preview only lives on this page: leaving it restores the
    // saved appearance, and closing the tab asks first.
    useEffect(() => () => discardPreview(), [discardPreview]);

    useEffect(() => {
        if (!isDirty) return undefined;
        const onBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [isDirty]);

    const set = (changes) => {
        setNotice(null);
        previewPreferences(changes);
    };

    const theme = findTheme(preferences.theme);
    const activePreset = findPreset(preferences);
    const fontName = findFont(preferences.fontFamily).name;
    const themeLabel = preferences.theme === "auto"
        ? `Auto · ${prefersDark ? "dark" : "light"} now`
        : theme.name;

    // Previews show the chosen accent; "Theme default" shows each theme's own.
    const accentHexFor = () => {
        if (preferences.accentColor === THEME_ACCENT_ID) return null;
        return ACCENT_COLORS.find((accent) => accent.id === preferences.accentColor)?.value || null;
    };

    const canSavePersonal = !locked && (isDirty || !personal.isCustom);

    // -------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------
    const handleSaveMine = async () => {
        setBusy("mine");
        const result = await savePersonal(preferences);
        setBusy("");
        setNotice(result.ok
            ? { tone: "ok", text: "Saved as your default. It will follow you on every device you sign in to." }
            : { tone: "error", text: result.error });
    };

    const handleDiscard = () => {
        discardPreview();
        setNotice({ tone: "info", text: "Unsaved changes discarded — your saved appearance is back." });
    };

    const handleReset = async () => {
        setBusy("reset");
        const result = await resetPersonal();
        setBusy("");
        setConfirmReset(false);
        const fallback = globalTheme.mode === "default" || globalTheme.mode === "enforced"
            ? "the organisation default"
            : "the MIARCUS default";
        setNotice(result.ok
            ? { tone: "ok", text: `Your appearance was reset. You now follow ${fallback}.` }
            : { tone: "error", text: result.error });
    };

    const handleSaveForAll = async () => {
        setBusy("global");
        const result = await saveGlobalTheme({ mode: orgMode, preferences, alsoSaveForMe: alsoForMe });
        setBusy("");
        setOrgDialog(false);
        if (!result.ok) {
            setNotice({ tone: "error", text: result.error });
            return;
        }
        const scope = orgMode === "enforced"
            ? "is now applied to every user and locked (administrators can still personalise)."
            : "is now the default for everyone who has not saved their own appearance.";
        setNotice({
            tone: result.warning ? "warn" : "ok",
            text: result.warning || `${themeLabel} ${scope}`
        });
    };

    const handleDisableGlobal = async () => {
        setBusy("disable");
        const result = await disableGlobalTheme();
        setBusy("");
        setConfirmDisable(false);
        setNotice(result.ok
            ? { tone: "ok", text: "Organisation appearance turned off. Everyone uses their own saved appearance again." }
            : { tone: "error", text: result.error });
    };

    const orgStatus = {
        off: { label: "Off", text: "Each user chooses their own appearance." },
        default: { label: "Default for everyone", text: "Applies to users who have not saved their own appearance." },
        enforced: { label: "Enforced", text: "Applied to every non-admin user; their own choices are locked." }
    }[globalTheme.mode] || { label: "Off", text: "" };

    // -------------------------------------------------------------
    // Render
    // -------------------------------------------------------------
    return (
        <div className="appearance-page pp-premium" data-rbac="ignore">
            <PremiumHero
                icon={FaPalette}
                eyebrow="Settings · Personalisation"
                title="Appearance"
                badge={isAdmin ? "Personal · Admin" : "Personal"}
                badgeTone="mint"
                subtitle="Personalise how MIARCUS looks and feels. Changes preview instantly — press “Save as my default” to keep them."
                meta={[
                    { label: "Theme", value: themeLabel },
                    { label: "Accent", value: accentName(preferences) },
                    { label: "Font", value: fontName },
                    { label: "Saved", value: SOURCE_LABEL[source] }
                ]}
                actions={
                    <button
                        type="button"
                        className="pp-hero-btn"
                        onClick={() => setConfirmReset(true)}
                        disabled={locked || (!personal.isCustom && !isDirty)}
                        title={locked ? "Appearance is managed by your administrator" : "Reset to default"}
                    >
                        <FaUndo aria-hidden="true" /> Reset to default
                    </button>
                }
            />

            {locked && (
                <div className="ap-banner ap-banner--lock" role="status">
                    <FaLock aria-hidden="true" />
                    <div>
                        <strong>Appearance managed by your administrator</strong>
                        <span>
                            {findTheme(globalTheme.preferences.theme).name} is applied to the whole portal.
                            You can view the options below but cannot change them right now.
                        </span>
                    </div>
                </div>
            )}

            {isAdmin && (
                <section className="appearance-section ap-org" aria-labelledby={`${uid}-org`}>
                    <div className="appearance-section-header">
                        <div className="ap-head">
                            <span className="ap-head-icon" aria-hidden="true"><FaCrown /></span>
                            <div>
                                <h2 id={`${uid}-org`}>Organisation appearance</h2>
                                <p>Administrators can publish the look below for all users — as a default people can change, or enforced.</p>
                            </div>
                        </div>
                        <span className={`ap-pill ap-pill--${globalTheme.mode}`}>{orgStatus.label}</span>
                    </div>
                    <div className="ap-org-row">
                        <div className="ap-org-current">
                            {globalTheme.mode === "off" ? (
                                <span>{orgStatus.text}</span>
                            ) : (
                                <>
                                    <ThemePreview theme={findTheme(globalTheme.preferences.theme)} accent={null} />
                                    <span>
                                        <strong>{findTheme(globalTheme.preferences.theme).name}</strong>
                                        <small>{accentName(globalTheme.preferences)} accent · {findFont(globalTheme.preferences.fontFamily).name} font</small>
                                        <small>{orgStatus.text}</small>
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="ap-org-actions">
                            <button type="button" className="ap-btn ap-btn--primary" onClick={() => { setOrgMode(globalTheme.mode === "enforced" ? "enforced" : "default"); setOrgDialog(true); }}>
                                <FaUsers aria-hidden="true" /> Save current look for all users
                            </button>
                            {globalTheme.mode !== "off" && (
                                <button type="button" className="ap-btn" onClick={() => setConfirmDisable(true)} disabled={busy === "disable"}>
                                    Turn off for all users
                                </button>
                            )}
                        </div>
                    </div>
                </section>
            )}

            <fieldset className="ap-fieldset" disabled={locked}>
                <legend className="ap-sr-only">Appearance options</legend>

                <Section
                    id={`${uid}-presets`}
                    icon={FaMagic}
                    title="Quick presets"
                    description="Apply a complete look — theme, accent and font — in one click."
                    aside={<span className="ap-pill">{activePreset ? activePreset.name : "Custom combination"}</span>}
                >
                    <div className="ap-presets" role="radiogroup" aria-label="Quick presets">
                        {PRESETS.map((preset) => {
                            const selected = activePreset?.id === preset.id;
                            const presetTheme = findTheme(preset.theme);
                            const accent = ACCENT_COLORS.find((item) => item.id === preset.accentColor);
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    className={`ap-preset${selected ? " is-on" : ""}`}
                                    onClick={() => set({ theme: preset.theme, accentColor: preset.accentColor, fontFamily: preset.fontFamily })}
                                >
                                    <span
                                        className="ap-preset-tile"
                                        style={{ "--ap-bg": presetTheme.preview.bg, "--ap-side": presetTheme.preview.side, "--ap-dot": accent?.value }}
                                        aria-hidden="true"
                                    >
                                        <span className="ap-preset-bar" />
                                        <i />
                                    </span>
                                    <span className="ap-preset-copy">
                                        <strong>{preset.name}</strong>
                                        <small>{presetTheme.name} · {accent?.name} · {findFont(preset.fontFamily).name}</small>
                                    </span>
                                    {selected && <FaCheck className="ap-check" aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </div>
                </Section>

                <Section
                    id={`${uid}-themes`}
                    icon={FaSwatchbook}
                    title="Choose your theme"
                    description="Applies across MIARCUS — sidebar, top bar, tables, forms and dialogs."
                    aside={<span className="ap-pill ap-pill--accent">{themeLabel}</span>}
                >
                    {THEME_GROUPS.map((group) => {
                        const list = THEMES.filter((item) => item.group === group.id);
                        const GroupIcon = GROUP_ICONS[group.icon];
                        return (
                            <div className="ap-group" key={group.id}>
                                <h3 className="ap-group-title" id={`${uid}-${group.id}`}>
                                    <GroupIcon aria-hidden="true" /> {group.title}
                                    <span className="ap-count">{list.length}</span>
                                </h3>
                                <div className="ap-theme-grid" role="radiogroup" aria-labelledby={`${uid}-${group.id}`}>
                                    {list.map((item) => {
                                        const selected = preferences.theme === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                role="radio"
                                                aria-checked={selected}
                                                className={`ap-theme${selected ? " is-on" : ""}`}
                                                onClick={() => set({ theme: item.id })}
                                            >
                                                <ThemePreview theme={item} accent={accentHexFor()} />
                                                <span className="ap-theme-copy">
                                                    <span className="ap-theme-name">
                                                        <span aria-hidden="true">{item.icon}</span> {item.name}
                                                    </span>
                                                    <span className="ap-theme-desc">{item.description}</span>
                                                </span>
                                                {selected && (
                                                    <span className="ap-check-badge" aria-hidden="true"><FaCheck /></span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </Section>

                <Section
                    id={`${uid}-accent`}
                    icon={FaPalette}
                    title="Accent colour"
                    description="Changes buttons, focus rings and highlights without changing your theme."
                    aside={<span className="ap-pill">Selected: {accentName(preferences)}</span>}
                >
                    <div className="ap-accents" role="radiogroup" aria-label="Accent colour">
                        <button
                            type="button"
                            role="radio"
                            aria-checked={preferences.accentColor === THEME_ACCENT_ID}
                            className={`ap-accent-default${preferences.accentColor === THEME_ACCENT_ID ? " is-on" : ""}`}
                            onClick={() => set({ accentColor: THEME_ACCENT_ID })}
                            title="Use the theme's own accent colour"
                        >
                            <span className="ap-swatch" style={{ "--swatch": theme.accent }} aria-hidden="true" />
                            Theme default
                            {preferences.accentColor === THEME_ACCENT_ID && <FaCheck aria-hidden="true" />}
                        </button>
                        {ACCENT_COLORS.map((accent) => {
                            const selected = preferences.accentColor === accent.id;
                            return (
                                <button
                                    key={accent.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    aria-label={accent.name}
                                    title={accent.name}
                                    className={`ap-accent${selected ? " is-on" : ""}`}
                                    style={{ "--swatch": accent.value }}
                                    onClick={() => set({ accentColor: accent.id })}
                                >
                                    {selected && <FaCheck aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </div>
                    <div className="ap-accent-sample" aria-hidden="true">
                        <span className="ap-sample-btn">Primary action</span>
                        <span className="ap-sample-link">Link text</span>
                        <span className="ap-sample-chip">Active filter</span>
                    </div>
                </Section>

                <div className="ap-two-col">
                    <Section
                        id={`${uid}-size`}
                        icon={FaTextHeight}
                        title="Text size"
                        description="A comfortable reading size for every page."
                    >
                        <Segmented
                            label="Text size"
                            options={TEXT_SIZES}
                            value={preferences.fontSize}
                            onChange={(fontSize) => set({ fontSize })}
                        />
                        <p className="ap-size-sample">
                            Preview: <span>The store checklist was submitted on time.</span>
                        </p>
                    </Section>

                    <Section
                        id={`${uid}-layout`}
                        icon={FaSlidersH}
                        title="Layout & motion"
                        description="Spacing, corners and animation."
                    >
                        <div className="ap-layout-rows">
                            <div className="ap-row">
                                <span className="ap-row-label"><FaColumns aria-hidden="true" /> Sidebar density</span>
                                <Segmented label="Sidebar density" options={SIDEBAR_DENSITIES} value={preferences.sidebarStyle} onChange={(sidebarStyle) => set({ sidebarStyle })} />
                            </div>
                            <div className="ap-row">
                                <span className="ap-row-label">Table row spacing</span>
                                <Segmented label="Table row spacing" options={TABLE_DENSITIES} value={preferences.tableDensity} onChange={(tableDensity) => set({ tableDensity })} />
                                <small>Compact rows show more records on one screen.</small>
                            </div>
                            <div className="ap-row">
                                <span className="ap-row-label">Corner style</span>
                                <Segmented label="Corner style" options={CORNER_STYLES} value={preferences.cornerStyle} onChange={(cornerStyle) => set({ cornerStyle })} />
                            </div>
                            <div className="ap-row">
                                <span className="ap-row-label">Animations</span>
                                <Segmented label="Animations" options={MOTION_OPTIONS} value={preferences.motion} onChange={(motion) => set({ motion })} />
                                <small>“Match device” follows your operating system’s reduce-motion setting.</small>
                            </div>
                        </div>
                    </Section>
                </div>

                <Section
                    id={`${uid}-font`}
                    icon={FaFont}
                    title="Font family"
                    description="Used for labels, forms, tables, dialogs and navigation."
                >
                    <div className="ap-fonts" role="radiogroup" aria-label="Font family">
                        {FONT_FAMILIES.map((font) => {
                            const selected = preferences.fontFamily === font.id;
                            return (
                                <button
                                    key={font.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    className={`ap-font${selected ? " is-on" : ""}`}
                                    onClick={() => set({ fontFamily: font.id })}
                                    title={font.description}
                                >
                                    <span className="ap-font-sample" style={{ fontFamily: font.stack }} aria-hidden="true">Aa</span>
                                    <span className="ap-font-name">{font.name}</span>
                                    <span className="ap-font-meta" style={{ fontFamily: font.stack }}>{font.sample}</span>
                                    {selected && <FaCheck className="ap-check" aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </div>
                </Section>
            </fieldset>

            <div className="ap-note">
                <FaInfoCircle aria-hidden="true" />
                <p>
                    <strong>How saving works:</strong> changes preview instantly on this page only.
                    <b> Save as my default</b> stores every option above in your MIARCUS account, so it follows you to
                    any device and is not changed for anyone else. Leaving this page without saving restores your saved look.
                    The sun / moon button in the top bar switches between your light and dark theme and saves it straight away.
                    {isAdmin && " As an administrator you can also save the current look for all users."}
                </p>
            </div>

            {/* Sticky save bar */}
            <div className={`ap-savebar${isDirty ? " is-dirty" : ""}`} role="region" aria-label="Save appearance">
                <div className="ap-savebar-status" role="status" aria-live="polite">
                    {notice ? (
                        <span className={`ap-notice ap-notice--${notice.tone}`}>{notice.text}</span>
                    ) : isDirty ? (
                        <span className="ap-notice ap-notice--warn">Previewing unsaved changes</span>
                    ) : (
                        <span className="ap-notice">
                            {locked ? "Managed by your administrator" : `Showing: ${SOURCE_LABEL[source]}`}
                            {" · "}{mode === "dark" ? "Night" : "Day"} mode
                        </span>
                    )}
                </div>
                <div className="ap-savebar-actions">
                    {isDirty && (
                        <button type="button" className="ap-btn" onClick={handleDiscard} disabled={Boolean(busy)}>
                            Discard changes
                        </button>
                    )}
                    {isAdmin && (
                        <button type="button" className="ap-btn" onClick={() => { setOrgMode(globalTheme.mode === "enforced" ? "enforced" : "default"); setOrgDialog(true); }} disabled={Boolean(busy)}>
                            <FaUsers aria-hidden="true" /> Save for all users
                        </button>
                    )}
                    <button
                        type="button"
                        className="ap-btn ap-btn--primary"
                        onClick={handleSaveMine}
                        disabled={!canSavePersonal || Boolean(busy)}
                    >
                        <FaSave aria-hidden="true" /> {busy === "mine" ? "Saving…" : "Save as my default"}
                    </button>
                </div>
            </div>

            {/* Admin: save for all users */}
            {orgDialog && (
                <div className="ap-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && busy !== "global") setOrgDialog(false); }}>
                    <div className="ap-dialog" role="dialog" aria-modal="true" aria-labelledby={`${uid}-dlg`} onKeyDown={(event) => { if (event.key === "Escape" && busy !== "global") setOrgDialog(false); }}>
                        <h2 id={`${uid}-dlg`}><FaUsers aria-hidden="true" /> Save for all users</h2>
                        <p className="ap-dialog-lead">
                            Publish <strong>{themeLabel}</strong> with {accentName(preferences)} accent and {fontName} font.
                        </p>
                        <div className="ap-choice-list" role="radiogroup" aria-label="How to apply">
                            <label className={`ap-choice${orgMode === "default" ? " is-on" : ""}`}>
                                <input type="radio" name={`${uid}-orgmode`} value="default" checked={orgMode === "default"} onChange={() => setOrgMode("default")} autoFocus />
                                <span>
                                    <strong>Default for everyone</strong>
                                    <small>Used by every user who has not saved their own appearance. Users can still personalise.</small>
                                </span>
                            </label>
                            <label className={`ap-choice${orgMode === "enforced" ? " is-on" : ""}`}>
                                <input type="radio" name={`${uid}-orgmode`} value="enforced" checked={orgMode === "enforced"} onChange={() => setOrgMode("enforced")} />
                                <span>
                                    <strong>Enforce for everyone</strong>
                                    <small>Applied to all non-admin users and their appearance options are locked.</small>
                                </span>
                            </label>
                        </div>
                        <label className="ap-check-row">
                            <input type="checkbox" checked={alsoForMe} onChange={(event) => setAlsoForMe(event.target.checked)} />
                            Also save it as my own default
                        </label>
                        <div className="ap-dialog-actions">
                            <button type="button" className="ap-btn" onClick={() => setOrgDialog(false)} disabled={busy === "global"}>Cancel</button>
                            <button type="button" className="ap-btn ap-btn--primary" onClick={handleSaveForAll} disabled={busy === "global"}>
                                {busy === "global" ? "Saving…" : "Save for all users"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={confirmReset}
                title="Reset appearance?"
                message={
                    globalTheme.mode === "default"
                        ? "Your saved appearance will be removed and you will follow the organisation default on every device."
                        : "Your saved appearance will be removed and the MIARCUS default (Miarcus Original, purple accent, default font) will be used on every device."
                }
                confirmText="Reset to default"
                confirmVariant="primary"
                loading={busy === "reset"}
                onConfirm={handleReset}
                onCancel={() => setConfirmReset(false)}
            />

            <ConfirmDialog
                open={confirmDisable}
                title="Turn off organisation appearance?"
                message="Every user will go back to their own saved appearance (or the MIARCUS default)."
                confirmText="Turn off"
                confirmVariant="primary"
                loading={busy === "disable"}
                onConfirm={handleDisableGlobal}
                onCancel={() => setConfirmDisable(false)}
            />
        </div>
    );
}

export default Appearance;
