import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    FaArrowDown,
    FaArrowUp,
    FaChartBar,
    FaChartLine,
    FaChartPie,
    FaCheckCircle,
    FaDatabase,
    FaLayerGroup,
    FaRedo,
    FaTachometerAlt,
    FaExclamationTriangle,
} from "react-icons/fa";

import "../../../styles/dashboard/DashboardAnalytics.css";

const numberFormatter = new Intl.NumberFormat("en-IN");

const formatNumber = (value) => numberFormatter.format(Number(value || 0));

const formatValue = (value) => {
    if (!Number(value)) return "—";
    return `₹${Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 0,
    })}`;
};

const palette = [
    "#2b7a82",
    "#6d5aa8",
    "#2f9d72",
    "#d9952f",
    "#d75c5c",
    "#4776a8",
    "#8b6bb5",
    "#4c9ca3",
];

const AnalyticsIcon = ({ type }) => {
    if (type === "pie") return <FaChartPie />;
    if (type === "bar") return <FaChartBar />;
    return <FaChartLine />;
};

function DonutChart({ items }) {
    const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0);

    if (!total) {
        return (
            <div className="analytics-empty-chart">
                <FaChartPie />
                <span>No distribution data yet</span>
            </div>
        );
    }

    let cursor = 0;
    const segments = items.map((item, index) => {
        const start = cursor;
        cursor += Number(item.total || 0);
        return {
            ...item,
            start,
            end: cursor,
            color: palette[index % palette.length],
        };
    });

    const radius = 62;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="analytics-donut-layout">
            <div className="analytics-donut">
                <svg viewBox="0 0 160 160" aria-label="Status distribution">
                    <circle
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="none"
                        stroke="#e8eef0"
                        strokeWidth="22"
                    />
                    {segments.map((segment) => {
                        const length =
                            ((segment.end - segment.start) / total) * circumference;
                        const offset =
                            -(segment.start / total) * circumference;

                        return (
                            <circle
                                key={segment.label}
                                cx="80"
                                cy="80"
                                r={radius}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth="22"
                                strokeDasharray={`${length} ${circumference - length}`}
                                strokeDashoffset={offset}
                                transform="rotate(-90 80 80)"
                                strokeLinecap="butt"
                            />
                        );
                    })}
                </svg>

                <div className="analytics-donut-center">
                    <strong>{formatNumber(total)}</strong>
                    <span>Total</span>
                </div>
            </div>

            <div className="analytics-legend">
                {segments.map((item) => (
                    <div className="analytics-legend-item" key={item.label}>
                        <span
                            className="analytics-legend-dot"
                            style={{ background: item.color }}
                        />
                        <span className="analytics-legend-label">{item.label}</span>
                        <strong>{formatNumber(item.total)}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BarChart({ items }) {
    if (!items.length) {
        return (
            <div className="analytics-empty-chart">
                <FaChartBar />
                <span>No status data yet</span>
            </div>
        );
    }

    const max = Math.max(...items.map((item) => Number(item.total || 0)), 1);

    return (
        <div className="analytics-bars">
            {items.slice(0, 7).map((item, index) => {
                const value = Number(item.total || 0);
                const width = Math.max((value / max) * 100, value ? 5 : 0);

                return (
                    <div className="analytics-bar-row" key={item.label}>
                        <div className="analytics-bar-meta">
                            <span title={item.label}>{item.label}</span>
                            <strong>{formatNumber(value)}</strong>
                        </div>
                        <div className="analytics-bar-track">
                            <span
                                className="analytics-bar-fill"
                                style={{
                                    width: `${width}%`,
                                    background: palette[index % palette.length],
                                }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function TrendChart({ points }) {
    const safePoints = points?.length ? points : [];

    if (!safePoints.length) {
        return (
            <div className="analytics-empty-chart">
                <FaChartLine />
                <span>No trend data yet</span>
            </div>
        );
    }

    const width = 620;
    const height = 230;
    const paddingX = 30;
    const paddingTop = 18;
    const paddingBottom = 34;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingTop - paddingBottom;
    const max = Math.max(...safePoints.map((point) => Number(point.total || 0)), 1);

    const coordinates = safePoints.map((point, index) => {
        const x =
            paddingX +
            (safePoints.length === 1
                ? chartWidth / 2
                : (index / (safePoints.length - 1)) * chartWidth);
        const y = paddingTop + chartHeight - (Number(point.total || 0) / max) * chartHeight;
        return { ...point, x, y };
    });

    const line = coordinates
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
        .join(" ");

    const area = `${line} L ${coordinates.at(-1).x} ${height - paddingBottom} L ${coordinates[0].x} ${height - paddingBottom} Z`;

    return (
        <div className="analytics-trend-chart">
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                {[0, 1, 2, 3].map((step) => {
                    const y = paddingTop + (chartHeight / 3) * step;
                    return (
                        <line
                            key={step}
                            x1={paddingX}
                            x2={width - paddingX}
                            y1={y}
                            y2={y}
                            className="analytics-grid-line"
                        />
                    );
                })}

                <path d={area} className="analytics-area" />
                <path d={line} className="analytics-line" />

                {coordinates.map((point) => (
                    <g key={point.day}>
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r="4.5"
                            className="analytics-point"
                        />
                        <text
                            x={point.x}
                            y={height - 11}
                            textAnchor="middle"
                            className="analytics-axis-label"
                        >
                            {point.label}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

function DashboardAnalytics() {
    const [modules, setModules] = useState([]);
    const [selectedKey, setSelectedKey] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadAnalytics = async () => {
        setLoading(true);
        setError("");

        try {
            const response = await axios.get("/api/dashboard/analytics");
            const data = response?.data?.data;
            setModules(Array.isArray(data) ? data : []);
            setLastUpdated(new Date());
        } catch (requestError) {
            console.error("Dashboard analytics:", requestError);
            setError(
                requestError?.response?.data?.message ||
                    "Unable to load analytics. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, []);

    const selectedModule = useMemo(() => {
        if (selectedKey === "all") return null;
        return modules.find((module) => module.key === selectedKey) || null;
    }, [modules, selectedKey]);

    const overview = useMemo(() => {
        const list = modules.filter((module) => module.key !== "dashboard");

        const total = list.reduce((sum, module) => sum + Number(module.total || 0), 0);
        const positive = list.filter((module) => Number(module.change || 0) > 0).length;
        const negative = list.filter((module) => Number(module.change || 0) < 0).length;
        const valueTotal = list.reduce(
            (sum, module) => sum + Number(module.valueTotal || 0),
            0
        );

        const statusMap = new Map();
        list.forEach((module) => {
            (module.status || []).forEach((item) => {
                statusMap.set(
                    item.label,
                    (statusMap.get(item.label) || 0) + Number(item.total || 0)
                );
            });
        });

        const status = Array.from(statusMap.entries())
            .map(([label, count]) => ({ label, total: count }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 7);

        const trendMap = new Map();
        list.forEach((module) => {
            (module.trend || []).forEach((point) => {
                trendMap.set(
                    point.day,
                    (trendMap.get(point.day) || 0) + Number(point.total || 0)
                );
            });
        });

        const trend = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let offset = 6; offset >= 0; offset -= 1) {
            const date = new Date(today);
            date.setDate(date.getDate() - offset);
            const day = date.toISOString().slice(0, 10);
            trend.push({
                day,
                label: date.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                }),
                total: trendMap.get(day) || 0,
            });
        }

        return {
            total,
            positive,
            negative,
            valueTotal,
            status,
            trend,
            moduleCount: list.length,
        };
    }, [modules]);

    const view = selectedModule || overview;

    const topStatus = view.status?.[0];
    const growth = selectedModule
        ? Number(selectedModule.change || 0)
        : modules.length
            ? Number(
                  (
                      modules
                          .filter((module) => module.key !== "dashboard")
                          .reduce((sum, module) => sum + Number(module.change || 0), 0) /
                      Math.max(overview.moduleCount, 1)
                  ).toFixed(1)
              )
            : 0;

    return (
        <div className="dashboard-analytics-page">
            <section className="analytics-hero">
                <div>
                    <div className="analytics-eyebrow">
                        <FaTachometerAlt /> MIARCUS BUSINESS INTELLIGENCE
                    </div>
                    <h1>Dashboard Analytics</h1>
                    <p>
                        Analyze every MIARCUS module from one professional workspace with
                        live database totals, status distribution, trends and movement.
                    </p>
                </div>

                <div className="analytics-hero-actions">
                    <label className="analytics-module-select">
                        <span>ANALYZE MODULE</span>
                        <select
                            value={selectedKey}
                            onChange={(event) => setSelectedKey(event.target.value)}
                        >
                            <option value="all">All Modules — Overview</option>
                            {modules.map((module) => (
                                <option key={module.key} value={module.key}>
                                    {module.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <button
                        type="button"
                        className="analytics-refresh"
                        onClick={loadAnalytics}
                        disabled={loading}
                        title="Refresh analytics"
                    >
                        <FaRedo className={loading ? "analytics-spin" : ""} />
                        Refresh
                    </button>
                </div>
            </section>

            {error && <div className="analytics-error">{error}</div>}

            {loading && !modules.length ? (
                <div className="analytics-loading-card">
                    <div className="analytics-loader" />
                    <strong>Loading business analytics…</strong>
                    <span>Reading module data from the MIARCUS database.</span>
                </div>
            ) : (
                <>
                    <section className="analytics-kpi-grid">
                        <article className="analytics-kpi-card teal">
                            <div className="analytics-kpi-icon"><FaDatabase /></div>
                            <div>
                                <span>Total Records</span>
                                <strong>{formatNumber(view.total)}</strong>
                                <small>{selectedModule ? selectedModule.name : `${overview.moduleCount} modules analyzed`}</small>
                            </div>
                        </article>

                        <article className="analytics-kpi-card green">
                            <div className="analytics-kpi-icon"><FaCheckCircle /></div>
                            <div>
                                <span>Top Status</span>
                                <strong className="analytics-kpi-status">
                                    {topStatus ? formatNumber(topStatus.total) : "—"}
                                </strong>
                                <small>{topStatus?.label || "No status data"}</small>
                            </div>
                        </article>

                        <article className={`analytics-kpi-card ${growth >= 0 ? "blue" : "red"}`}>
                            <div className="analytics-kpi-icon">
                                {growth >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                            </div>
                            <div>
                                <span>Movement</span>
                                <strong>{growth > 0 ? "+" : ""}{growth}%</strong>
                                <small>Recent activity trend</small>
                            </div>
                        </article>

                        <article className="analytics-kpi-card purple">
                            <div className="analytics-kpi-icon"><FaLayerGroup /></div>
                            <div>
                                <span>Tracked Value</span>
                                <strong>{formatValue(view.valueTotal)}</strong>
                                <small>{selectedModule ? "Detected numeric totals" : "Across measurable modules"}</small>
                            </div>
                        </article>
                    </section>

                    <section className="analytics-chart-grid">
                        <article className="analytics-panel analytics-panel-large">
                            <div className="analytics-panel-heading">
                                <div>
                                    <div className="analytics-panel-kicker">STATUS INTELLIGENCE</div>
                                    <h2>{selectedModule ? `${selectedModule.name} Status Distribution` : "Module Status Distribution"}</h2>
                                </div>
                                <div className="analytics-panel-icon pie"><AnalyticsIcon type="pie" /></div>
                            </div>
                            <DonutChart items={view.status || []} />
                        </article>

                        <article className="analytics-panel">
                            <div className="analytics-panel-heading">
                                <div>
                                    <div className="analytics-panel-kicker">COMPARATIVE VIEW</div>
                                    <h2>{selectedModule ? "Status Performance" : "Top Module Activity"}</h2>
                                </div>
                                <div className="analytics-panel-icon bar"><AnalyticsIcon type="bar" /></div>
                            </div>
                            {selectedModule ? (
                                <BarChart items={view.status || []} />
                            ) : (
                                <div className="analytics-module-bars">
                                    {modules
                                        .filter((module) => module.key !== "dashboard")
                                        .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
                                        .slice(0, 8)
                                        .map((module, index) => {
                                            const max = Math.max(
                                                ...modules.map((item) => Number(item.total || 0)),
                                                1
                                            );
                                            const width = Math.max(
                                                (Number(module.total || 0) / max) * 100,
                                                module.total ? 4 : 0
                                            );

                                            return (
                                                <button
                                                    type="button"
                                                    className="analytics-module-bar"
                                                    key={module.key}
                                                    onClick={() => setSelectedKey(module.key)}
                                                >
                                                    <span>{module.name}</span>
                                                    <strong>{formatNumber(module.total)}</strong>
                                                    <i>
                                                        <b
                                                            style={{
                                                                width: `${width}%`,
                                                                background: palette[index % palette.length],
                                                            }}
                                                        />
                                                    </i>
                                                </button>
                                            );
                                        })}
                                </div>
                            )}
                        </article>
                    </section>

                    <section className="analytics-panel analytics-trend-panel">
                        <div className="analytics-panel-heading">
                            <div>
                                <div className="analytics-panel-kicker">TRENDING FLOW</div>
                                <h2>{selectedModule ? `${selectedModule.name} Activity — Last 7 Days` : "MIARCUS Activity — Last 7 Days"}</h2>
                            </div>
                            <div className={`analytics-trend-badge ${growth >= 0 ? "up" : "down"}`}>
                                {growth >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                                {growth > 0 ? "+" : ""}{growth}%
                            </div>
                        </div>
                        <TrendChart points={view.trend || []} />
                    </section>

                    <section className="analytics-module-section">
                        <div className="analytics-section-heading">
                            <div>
                                <div className="analytics-panel-kicker">ALL MODULES</div>
                                <h2>Module Performance Overview</h2>
                            </div>
                            <span>{overview.moduleCount} modules</span>
                        </div>

                        <div className="analytics-module-grid">
                            {modules
                                .filter((module) => module.key !== "dashboard")
                                .map((module) => {
                                    const isSelected = selectedKey === module.key;
                                    const positive = Number(module.change || 0) >= 0;

                                    return (
                                        <button
                                            type="button"
                                            className={`analytics-module-card ${isSelected ? "selected" : ""}`}
                                            key={module.key}
                                            onClick={() => setSelectedKey(module.key)}
                                        >
                                            <div className="analytics-module-card-top">
                                                <span className="analytics-module-mini-icon">
                                                    <FaLayerGroup />
                                                </span>
                                                <span className={`analytics-direction ${positive ? "up" : "down"}`}>
                                                    {positive ? <FaArrowUp /> : <FaArrowDown />}
                                                    {Math.abs(Number(module.change || 0))}%
                                                </span>
                                            </div>
                                            <strong>{module.name}</strong>
                                            <b>{formatNumber(module.total)}</b>
                                            <span className="analytics-module-subtitle">
                                                {module.status?.[0]
                                                    ? `${module.status[0].label}: ${formatNumber(module.status[0].total)}`
                                                    : "No status breakdown"}
                                            </span>
                                            <div className="analytics-mini-flow">
                                                {(module.trend || []).map((point, index) => (
                                                    <i
                                                        key={`${module.key}-${point.day}`}
                                                        style={{
                                                            height: `${Math.max(
                                                                4,
                                                                Math.min(
                                                                    30,
                                                                    Number(point.total || 0) + 4
                                                                )
                                                            )}px`,
                                                            opacity: 0.45 + index / 18,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    </section>

                    <section className="analytics-insight-grid">
                        <article className="analytics-insight-card">
                            <div className="analytics-insight-icon"><FaArrowUp /></div>
                            <div>
                                <strong>Growing Modules</strong>
                                <span>{overview.positive} modules are moving upward in the recent activity window.</span>
                            </div>
                        </article>
                        <article className="analytics-insight-card warning">
                            <div className="analytics-insight-icon"><FaExclamationTriangle /></div>
                            <div>
                                <strong>Modules Requiring Attention</strong>
                                <span>{overview.negative} modules are showing a downward movement.</span>
                            </div>
                        </article>
                        <article className="analytics-insight-card purple">
                            <div className="analytics-insight-icon"><FaChartLine /></div>
                            <div>
                                <strong>Analytics Coverage</strong>
                                <span>Counts, status distribution and 7-day trend flow are available across the module workspace.</span>
                            </div>
                        </article>
                    </section>
                </>
            )}

            <div className="analytics-footer">
                <span>
                    {lastUpdated
                        ? `Last updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                        : "Waiting for analytics data"}
                </span>
                <span>MIARCUS Business Analytics</span>
            </div>
        </div>
    );
}

export default DashboardAnalytics;
