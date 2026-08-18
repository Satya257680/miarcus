import React from "react";
import {
    FaCheck,
    FaPalette,
    FaTextHeight,
    FaSun,
    FaMoon,
    FaDesktop,
    FaBars,
    FaExpand,
    FaCompress,
    FaMagic,
    FaSave,
    FaUndo
} from "react-icons/fa";

import PageHeader from "../../components/common/PageHeader";
import { useTheme } from "../../context/ThemeProvider";
import "../../styles/pages/Appearance.css";

function Appearance() {
    const {
        preferences,
        themes,
        accentColors,
        updatePreferences,
        resetPreferences
    } = useTheme();

    const currentTheme = themes.find((item) => item.id === preferences.theme);

    const setMode = (mode) => updatePreferences({ mode });

    return (
        <div className="appearance-page">
            <PageHeader
                title="Appearance"
                subtitle="Personalize how Miarcus looks and feels for your account."
            />

            <section className="appearance-section">
                <div className="appearance-section-header">
                    <div>
                        <h2>Choose your theme</h2>
                        <p>Your theme changes the complete Miarcus application.</p>
                    </div>
                    <span className="appearance-current">
                        {currentTheme?.name || "Miarcus Original"}
                    </span>
                </div>

                <div className="theme-grid">
                    {themes.map((theme) => {
                        const selected = theme.id === preferences.theme;
                        return (
                            <button
                                key={theme.id}
                                type="button"
                                className={`theme-card ${selected ? "selected" : ""}`}
                                onClick={() => updatePreferences({
                                    theme: theme.id,
                                    mode: theme.id === "dark" || theme.id === "midnight" || theme.id === "high-contrast"
                                        ? "dark"
                                        : preferences.mode
                                })}
                                aria-pressed={selected}
                            >
                                <div className={`theme-preview theme-preview-${theme.preview}`}>
                                    <div className="preview-sidebar" />
                                    <div className="preview-main">
                                        <div className="preview-topbar" />
                                        <div className="preview-cards"><span /><span /><span /></div>
                                        <div className="preview-chart" />
                                    </div>
                                </div>
                                <div className="theme-card-body">
                                    <div className="theme-card-title">
                                        <span className="theme-icon">{theme.icon}</span>
                                        <span>{theme.name}</span>
                                        {selected && <span className="theme-selected"><FaCheck /></span>}
                                    </div>
                                    <p>{theme.description}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="appearance-section">
                <div className="appearance-section-header">
                    <div>
                        <h2><FaSun /> Light / Dark mode</h2>
                        <p>Change the application mode instantly. This control is also available in the topbar.</p>
                    </div>
                </div>

                <div className="mode-options">
                    <button type="button" className={`mode-option ${preferences.mode === "light" ? "selected" : ""}`} onClick={() => setMode("light")}>
                        <FaSun /> Light
                        {preferences.mode === "light" && <FaCheck />}
                    </button>
                    <button type="button" className={`mode-option ${preferences.mode === "dark" ? "selected" : ""}`} onClick={() => setMode("dark")}>
                        <FaMoon /> Dark
                        {preferences.mode === "dark" && <FaCheck />}
                    </button>
                </div>
            </section>

            <section className="appearance-section">
                <div className="appearance-section-header">
                    <div>
                        <h2><FaPalette /> Accent color</h2>
                        <p>Change buttons, active states, highlights and focus colors.</p>
                    </div>
                </div>

                <div className="accent-options">
                    {accentColors.map((accent) => {
                        const selected = accent.id === preferences.accentColor;
                        return (
                            <button
                                key={accent.id}
                                type="button"
                                className={`accent-option ${selected ? "selected" : ""}`}
                                onClick={() => updatePreferences({ accentColor: accent.id })}
                                title={accent.name}
                                aria-label={`Use ${accent.name} accent`}
                            >
                                <span style={{ backgroundColor: accent.value }} />
                                {selected && <FaCheck />}
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="appearance-section">
                <div className="appearance-control-grid">
                    <div className="control-card">
                        <h3><FaTextHeight /> Text size</h3>
                        <p>Choose a comfortable reading size.</p>
                        <div className="size-options">
                            {["small", "medium", "large"].map((size) => (
                                <button
                                    key={size}
                                    type="button"
                                    className={`size-option ${preferences.fontSize === size ? "selected" : ""}`}
                                    onClick={() => updatePreferences({ fontSize: size })}
                                >
                                    {size.charAt(0).toUpperCase() + size.slice(1)}
                                    {preferences.fontSize === size && <FaCheck />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="control-card">
                        <h3><FaBars /> Sidebar style</h3>
                        <p>Choose how much space navigation uses.</p>
                        <div className="size-options">
                            <button type="button" className={`size-option ${preferences.sidebarStyle === "comfortable" ? "selected" : ""}`} onClick={() => updatePreferences({ sidebarStyle: "comfortable" })}>
                                Comfortable {preferences.sidebarStyle === "comfortable" && <FaCheck />}
                            </button>
                            <button type="button" className={`size-option ${preferences.sidebarStyle === "compact" ? "selected" : ""}`} onClick={() => updatePreferences({ sidebarStyle: "compact" })}>
                                Compact {preferences.sidebarStyle === "compact" && <FaCheck />}
                            </button>
                        </div>
                    </div>

                    <div className="control-card">
                        <h3><FaExpand /> Layout mode</h3>
                        <p>Choose the normal or wider content area.</p>
                        <div className="size-options">
                            <button type="button" className={`size-option ${preferences.layoutMode === "default" ? "selected" : ""}`} onClick={() => updatePreferences({ layoutMode: "default" })}>
                                Default {preferences.layoutMode === "default" && <FaCheck />}
                            </button>
                            <button type="button" className={`size-option ${preferences.layoutMode === "wide" ? "selected" : ""}`} onClick={() => updatePreferences({ layoutMode: "wide" })}>
                                Wide {preferences.layoutMode === "wide" && <FaCheck />}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="appearance-section">
                <div className="appearance-control-grid">
                    <div className="control-card">
                        <h3><FaMagic /> Animations</h3>
                        <p>Enable or disable visual transitions and motion.</p>
                        <div className="toggle-line">
                            <span>{preferences.animations ? "Enabled" : "Disabled"}</span>
                            <button
                                type="button"
                                className={`switch ${preferences.animations ? "on" : ""}`}
                                onClick={() => updatePreferences({ animations: !preferences.animations })}
                                aria-label="Toggle animations"
                            >
                                <span />
                            </button>
                        </div>
                    </div>

                    <div className="control-card">
                        <h3><FaSave /> Remember my preference</h3>
                        <p>Keep this appearance when you sign in from another device.</p>
                        <div className="toggle-line">
                            <span>{preferences.rememberPreference ? "Enabled" : "Disabled"}</span>
                            <button
                                type="button"
                                className={`switch ${preferences.rememberPreference ? "on" : ""}`}
                                onClick={() => updatePreferences({ rememberPreference: !preferences.rememberPreference })}
                                aria-label="Toggle remember preference"
                            >
                                <span />
                            </button>
                        </div>
                    </div>

                    <div className="control-card">
                        <h3><FaCompress /> Current mode</h3>
                        <p>The selected mode is applied globally across all modules.</p>
                        <strong>{preferences.mode === "dark" ? "🌙 Dark mode" : "☀️ Light mode"}</strong>
                    </div>
                </div>

                <div className="appearance-actions">
                    <button type="button" className="appearance-action" onClick={() => resetPreferences()}>
                        <FaUndo /> Reset to default
                    </button>
                    <button type="button" className="appearance-action primary" onClick={() => updatePreferences(preferences)}>
                        <FaSave /> Save current settings
                    </button>
                </div>

                <div className="appearance-note">
                    <strong>Personal setting:</strong> your appearance preference is saved to your Miarcus account and follows you when you sign in from another device.
                </div>
            </section>
        </div>
    );
}

export default Appearance;
