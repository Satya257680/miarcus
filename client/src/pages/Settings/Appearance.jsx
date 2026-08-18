import React from "react";
import { FaCheck, FaPalette, FaTextHeight } from "react-icons/fa";

import PageHeader from "../../components/common/PageHeader";
import {
    useTheme
} from "../../context/ThemeProvider";

import "../../styles/pages/Appearance.css";

function Appearance() {
    const {
        preferences,
        themes,
        accentColors,
        updatePreferences
    } = useTheme();

    const currentTheme =
        preferences.theme;

    const currentAccent =
        preferences.accentColor;

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

                <div className="theme-grid">
                    {themes.map((theme) => {
                        const selected =
                            theme.id === currentTheme;

                        return (
                            <button
                                key={theme.id}
                                type="button"
                                className={`theme-card ${
                                    selected
                                        ? "selected"
                                        : ""
                                }`}
                                onClick={() =>
                                    updatePreferences({
                                        theme: theme.id
                                    })
                                }
                                aria-pressed={selected}
                            >
                                <div
                                    className={`theme-preview theme-preview-${theme.preview}`}
                                >
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
                                        <span className="theme-icon">
                                            {theme.icon}
                                        </span>

                                        <span>
                                            {theme.name}
                                        </span>

                                        {selected && (
                                            <span className="theme-selected">
                                                <FaCheck />
                                            </span>
                                        )}
                                    </div>

                                    <p>
                                        {theme.description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
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
                        <h2>Sidebar density</h2>
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

            <div className="appearance-note">
                <strong>Personal setting:</strong>
                {" "}
                your appearance preference is saved to your Miarcus account and will follow you when you sign in from another device.
            </div>

        </div>
    );
}

export default Appearance;
