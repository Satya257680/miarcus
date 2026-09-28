import { useState } from "react";
import {
    FaCheck,
    FaFont,
    FaPalette,
    FaTextHeight,
    FaSwatchbook,
    FaMagic,
    FaUndo,
    FaSlidersH,
    FaColumns,
    FaMoon,
    FaSun
} from "react-icons/fa";

import { useTheme } from "../../context/ThemeProvider";
import { readUiExtras, applyUiExtras, DEFAULT_UI_EXTRAS } from "../../utils/uiExtras";

import "../../styles/pages/Appearance.css";
import "../../styles/premium/PagePremium.css";
import "../../styles/premium/AdminPagesPremium.css";
import PremiumHero from "../../components/premium/PremiumHero";

const DARK_THEMES = ["dark", "midnight", "aurora", "high-contrast"];

// One-click looks that set theme + accent + font together.
const PRESETS = [
    { id: "p-original", name: "MIARCUS Classic", theme: "miarcus-original", accentColor: "purple", fontFamily: "default" },
    { id: "p-premium", name: "Premium Violet", theme: "lavender", accentColor: "violet", fontFamily: "modern" },
    { id: "p-exec", name: "Executive", theme: "royal", accentColor: "gold", fontFamily: "serif" },
    { id: "p-calm", name: "Calm Focus", theme: "nord", accentColor: "blue", fontFamily: "system" },
    { id: "p-night", name: "Night Shift", theme: "aurora", accentColor: "teal", fontFamily: "modern" },
    { id: "p-fresh", name: "Fresh Retail", theme: "emerald", accentColor: "green", fontFamily: "rounded" }
];

function Segmented({ value, options, onChange }) {
    return (
    <div className="ap-segmented" role="radiogroup">
        {options.map((option) => (
            <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={value === option.id}
                className={value === option.id ? "is-on" : ""}
                onClick={() => onChange(option.id)}
            >
                {option.label}
            </button>
        ))}
    </div>
    );
}

function Appearance() {
    const {
        preferences,
        themes,
        accentColors,
        fontFamilies,
        updatePreferences
    } = useTheme();

    const currentTheme =
        preferences.theme;

    const currentAccent =
        preferences.accentColor;

    const [extras, setExtras] = useState(() => readUiExtras());

    const updateExtras = (patch) => {
        setExtras(applyUiExtras({ ...extras, ...patch }));
    };

    const themeName = themes.find((item) => item.id === currentTheme)?.name || "Miarcus Original";
    const accentName = accentColors.find((item) => item.id === currentAccent)?.name || "Purple";
    const fontName = fontFamilies.find((item) => item.id === preferences.fontFamily)?.name || "Default";

    const resetAll = () => {
        updatePreferences({
            theme: "miarcus-original",
            accentColor: "purple",
            fontSize: "medium",
            fontFamily: "default",
            sidebarStyle: "comfortable"
        });
        setExtras(applyUiExtras(DEFAULT_UI_EXTRAS));
    };

    const lightThemes = themes.filter((t) => !DARK_THEMES.includes(t.id));
    const darkThemes = themes.filter((t) => DARK_THEMES.includes(t.id));

    const renderThemeCard = (theme) => {
        const selected = theme.id === currentTheme;
        return (
            <button
                key={theme.id}
                type="button"
                className={`theme-card ${selected ? "selected" : ""}`}
                onClick={() => updatePreferences({ theme: theme.id })}
                aria-pressed={selected}
            >
                <div className={`theme-preview theme-preview-${theme.preview}`}>
                    <div className="preview-sidebar" />
                    <div className="preview-main">
                        <div className="preview-topbar" />
                        <div className="preview-cards">
                            <span />
                            <span />
                            <span />
                        </div>
                        <div className="preview-chart" />
                    </div>
                </div>

                <div className="theme-card-body">
                    <div className="theme-card-title">
                        <span className="theme-icon">{theme.icon}</span>
                        <span>{theme.name}</span>
                        {selected && (
                            <span className="theme-selected">
                                <FaCheck />
                            </span>
                        )}
                    </div>
                    <p>{theme.description}</p>
                </div>
            </button>
        );
    };


    return (
        <div className="appearance-page pp-premium">

            <PremiumHero
                icon={FaPalette}
                eyebrow="Settings · Personalisation"
                title="Appearance"
                badge="Personal"
                badgeTone="mint"
                subtitle="Personalise how MIARCUS looks and feels — theme, accent, typography, density and motion."
                meta={[
                    { label: "Theme", value: themeName },
                    { label: "Accent", value: accentName },
                    { label: "Font", value: fontName }
                ]}
                actions={
                    <button type="button" className="pp-hero-btn" onClick={resetAll}>
                        <FaUndo /> Reset to default
                    </button>
                }
            />

            <section className="appearance-section">
                <div className="appearance-section-header">
                    <div>
                        <h2><FaMagic /> Quick presets</h2>
                        <p>Apply a complete look — theme, accent and font — in one click.</p>
                    </div>
                </div>

                <div className="ap-presets">
                    {PRESETS.map((preset) => {
                        const active = preset.theme === currentTheme && preset.accentColor === currentAccent && preset.fontFamily === preferences.fontFamily;
                        const theme = themes.find((t) => t.id === preset.theme);
                        const accent = accentColors.find((a) => a.id === preset.accentColor);
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                className={`ap-preset ${active ? "is-on" : ""}`}
                                onClick={() => updatePreferences({ theme: preset.theme, accentColor: preset.accentColor, fontFamily: preset.fontFamily })}
                            >
                                <span className={`ap-preset-swatch theme-preview-${theme?.preview || "original"}`}>
                                    <i style={{ background: accent?.value }} />
                                </span>
                                <span className="ap-preset-copy">
                                    <strong>{preset.name}</strong>
                                    <small>{theme?.name} · {accent?.name}</small>
                                </span>
                                {active && <FaCheck className="ap-preset-check" />}
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="appearance-section">
                <div className="appearance-section-header">
                    <div>
                        <h2><FaSwatchbook /> Choose your theme</h2>
                        <p>
                            Your choice applies across the Miarcus application.
                        </p>
                    </div>

                    <span className="appearance-current">
                        {themes.find(
                            (item) =>
                                item.id === currentTheme
                        )?.name || "Miarcus Original"}
                    </span>
                </div>

                <div className="ap-theme-group-title"><FaSun /> Light themes <span>{lightThemes.length}</span></div>
                <div className="theme-grid">
                    {lightThemes.map(renderThemeCard)}
                </div>

                <div className="ap-theme-group-title"><FaMoon /> Dark &amp; high-contrast <span>{darkThemes.length}</span></div>
                <div className="theme-grid">
                    {darkThemes.map(renderThemeCard)}
                </div>
            </section>

            <section className="appearance-section">
                <div className="appearance-section-header">
                    <div>
                        <h2>
                            <FaPalette />
                            Accent color
                        </h2>

                        <p>
                            Change buttons, active states and highlights without changing your theme.
                        </p>
                    </div>
                </div>

                <div className="accent-options">
                    {accentColors.map((accent) => {
                        const selected =
                            accent.id === currentAccent;

                        return (
                            <button
                                key={accent.id}
                                type="button"
                                className={`accent-option ${
                                    selected
                                        ? "selected"
                                        : ""
                                }`}
                                onClick={() =>
                                    updatePreferences({
                                        accentColor:
                                            accent.id
                                    })
                                }
                                title={accent.name}
                                aria-label={`Use ${accent.name} accent`}
                            >
                                <span
                                    style={{
                                        backgroundColor:
                                            accent.value
                                    }}
                                />

                                {selected && (
                                    <FaCheck />
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="appearance-section">
                <div className="appearance-section-header">
                    <div>
                        <h2>
                            <FaTextHeight />
                            Text size
                        </h2>

                        <p>
                            Choose a comfortable reading size for Miarcus.
                        </p>
                    </div>
                </div>

                <div className="size-options">
                    {[
                        {
                            id: "small",
                            label: "Small"
                        },
                        {
                            id: "medium",
                            label: "Medium"
                        },
                        {
                            id: "large",
                            label: "Large"
                        }
                    ].map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`size-option ${
                                preferences.fontSize ===
                                item.id
                                    ? "selected"
                                    : ""
                            }`}
                            onClick={() =>
                                updatePreferences({
                                    fontSize:
                                        item.id
                                })
                            }
                        >
                            {item.label}

                            {preferences.fontSize ===
                                item.id && (
                                <FaCheck />
                            )}
                        </button>
                    ))}
                </div>
            </section>

            <section className="appearance-section">
                <div className="appearance-section-header">
                    <div>
                        <h2>
                            <FaFont />
                            Font family
                        </h2>

                        <p>
                            Pick the typeface used throughout Miarcus.
                        </p>
                    </div>
                </div>

                <div className="size-options font-options">
                    {fontFamilies.map((font) => (
                        <button
                            key={font.id}
                            type="button"
                            className={`size-option font-option ${
                                preferences.fontFamily ===
                                font.id
                                    ? "selected"
                                    : ""
                            }`}
                            style={{
                                fontFamily: font.stack
                            }}
                            onClick={() =>
                                updatePreferences({
                                    fontFamily:
                                        font.id
                                })
                            }
                            title={font.description}
                        >
                            <span className="font-option-sample">
                                Aa
                            </span>

                            {font.name}

                            {preferences.fontFamily ===
                                font.id && (
                                <FaCheck />
                            )}
                        </button>
                    ))}
                </div>
            </section>

            <section className="appearance-section">
                <div className="appearance-section-header">
                    <div>
                        <h2><FaColumns /> Sidebar density</h2>
                        <p>
                            Choose a comfortable or compact navigation layout.
                        </p>
                    </div>
                </div>

                <div className="size-options">
                    <button
                        type="button"
                        className={`size-option ${
                            preferences.sidebarStyle ===
                            "comfortable"
                                ? "selected"
                                : ""
                        }`}
                        onClick={() =>
                            updatePreferences({
                                sidebarStyle:
                                    "comfortable"
                            })
                        }
                    >
                        Comfortable

                        {preferences.sidebarStyle ===
                            "comfortable" && (
                            <FaCheck />
                        )}
                    </button>

                    <button
                        type="button"
                        className={`size-option ${
                            preferences.sidebarStyle ===
                            "compact"
                                ? "selected"
                                : ""
                        }`}
                        onClick={() =>
                            updatePreferences({
                                sidebarStyle:
                                    "compact"
                            })
                        }
                    >
                        Compact

                        {preferences.sidebarStyle ===
                            "compact" && (
                            <FaCheck />
                        )}
                    </button>
                </div>
            </section>

            <section className="appearance-section">
                <div className="appearance-section-header">
                    <div>
                        <h2><FaSlidersH /> Interface</h2>
                        <p>Fine-tune corners, animation and table spacing on this device.</p>
                    </div>
                </div>

                <div className="ap-interface-grid">
                    <div className="ap-interface-row">
                        <div>
                            <strong>Corner style</strong>
                            <span>How rounded cards, buttons and inputs look.</span>
                        </div>
                        <Segmented
                            value={extras.radius}
                            onChange={(radius) => updateExtras({ radius })}
                            options={[
                                { id: "rounded", label: "Rounded" },
                                { id: "soft", label: "Soft" },
                                { id: "sharp", label: "Sharp" }
                            ]}
                        />
                    </div>

                    <div className="ap-interface-row">
                        <div>
                            <strong>Animations</strong>
                            <span>Reduce motion if hover and page effects feel distracting.</span>
                        </div>
                        <Segmented
                            value={extras.motion}
                            onChange={(motion) => updateExtras({ motion })}
                            options={[
                                { id: "full", label: "Full" },
                                { id: "reduced", label: "Reduced" }
                            ]}
                        />
                    </div>

                    <div className="ap-interface-row">
                        <div>
                            <strong>Table density</strong>
                            <span>Compact rows show more records on one screen.</span>
                        </div>
                        <Segmented
                            value={extras.density}
                            onChange={(density) => updateExtras({ density })}
                            options={[
                                { id: "comfortable", label: "Comfortable" },
                                { id: "compact", label: "Compact" }
                            ]}
                        />
                    </div>
                </div>
            </section>

            <div className="appearance-note">
                <strong>Personal setting:</strong>
                {" "}
                theme, accent, text size, font and sidebar are saved to your Miarcus account and follow you to other devices. Interface options are saved on this device.
            </div>

        </div>
    );
}

export default Appearance;
