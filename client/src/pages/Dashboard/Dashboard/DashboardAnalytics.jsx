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

function TrendChart({ points, range = "sevenDays" }) {
    const safePoints = points?.length ? points : [];

    if (!safePoints.length) {
        return (
            <div className="analytics-empty-chart">
                <FaChartLine />
                <span>No trend data yet</span>
            </div>
        );
    }

    /*
     * The flow is based on day-over-day movement, not the absolute record
     * count.  This gives the chart a real zero baseline:
     *   green + above the line = growth
     *   red   - below the line = loss
     *   neutral on the line   = no movement
     */
    const movements = safePoints.map((point, index) => {
        const current = Number(point.total || 0);
        const previous = index === 0 ? current : Number(safePoints[index - 1].total || 0);
        return {
            ...point,
            movement: index === 0 ? 0 : current - previous,
        };
    });

    const width = 760;
    const height = 260;
    const paddingX = 34;
    const paddingTop = 20;
    const paddingBottom = 42;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingTop - paddingBottom;
    const baseline = paddingTop + chartHeight / 2;
    const maxMovement = Math.max(
        ...movements.map((point) => Math.abs(Number(point.movement || 0))),
        1
    );

    const coordinates = movements.map((point, index) => {
        const x =
            paddingX +
            (safePoints.length === 1
                ? chartWidth / 2
                : (index / (safePoints.length - 1)) * chartWidth);

        const movement = Number(point.movement || 0);
        const y = baseline - (movement / maxMovement) * (chartHeight / 2 - 14);

        return { ...point, x, y };
    });

    const positivePoints = coordinates.filter((point) => point.movement > 0);
    const negativePoints = coordinates.filter((point) => point.movement < 0);

    const segments = coordinates.slice(1).map((point, index) => {
        const previous = coordinates[index];
        const positive = point.movement > 0;
        const negative = point.movement < 0;

        return {
            previous,
            point,
            positive,
            negative,
        };
    });

    return (
        <div className="analytics-trend-chart analytics-trend-flow-chart">
            <div className="analytics-trend-flow-summary">
                <span className="analytics-flow-key growth">
                    <i /> Growth / Up
                </span>
                <span className="analytics-flow-key loss">
                    <i /> Loss / Down
                </span>
                <span className="analytics-flow-key flat">
                    <i /> No movement
                </span>
            </div>

            <svg
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                aria-label={`${range} growth and loss trend`}
            >
                <line
                    x1={paddingX}
                    x2={width - paddingX}
                    y1={baseline}
                    y2={baseline}
                    className="analytics-trend-zero-line"
                />

                <line
                    x1={paddingX}
                    x2={width - paddingX}
                    y1={paddingTop}
                    y2={paddingTop}
                    className="analytics-trend-zone-line growth-zone"
                />
                <line
                    x1={paddingX}
                    x2={width - paddingX}
                    y1={height - paddingBottom}
                    y2={height - paddingBottom}
                    className="analytics-trend-zone-line loss-zone"
                />

                <text
                    x={paddingX + 3}
                    y={paddingTop - 5}
                    className="analytics-trend-zone-label growth-label"
                >
                    GROWTH
                </text>
                <text
                    x={paddingX + 3}
                    y={height - paddingBottom + 16}
                    className="analytics-trend-zone-label loss-label"
                >
                    LOSS
                </text>

                {segments.map(({ previous, point, positive, negative }) => {
                    const segmentClass = positive
                        ? "analytics-flow-segment growth"
                        : negative
                            ? "analytics-flow-segment loss"
                            : "analytics-flow-segment flat";

                    const fillClass = positive
                        ? "analytics-flow-fill growth"
                        : negative
                            ? "analytics-flow-fill loss"
                            : "analytics-flow-fill flat";

                    const areaPath = `M ${previous.x} ${baseline} L ${point.x} ${point.y} L ${point.x} ${baseline} Z`;

                    return (
                        <g key={`${point.day}-${point.movement}`}>
                            <path d={areaPath} className={fillClass} />
                            <line
                                x1={previous.x}
                                y1={baseline}
                                x2={point.x}
                                y2={point.y}
                                className={segmentClass}
                            />
                        </g>
                    );
                })}

                {coordinates.map((point, index) => {
                    const movement = Number(point.movement || 0);
                    const directionClass =
                        movement > 0 ? "growth" : movement < 0 ? "loss" : "flat";
                    const sign = movement > 0 ? "+" : "";
                    const labelStep = range === "daily" ? 4 : range === "monthly" ? 1 : 1;
                    const showLabel =
                        range === "sevenDays" || range === "monthly" || range === "yearly"
                            ? true
                            : index % labelStep === 0 || index === coordinates.length - 1;

                    return (
                        <g key={`${point.period || point.day}-${index}`}>
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r="5"
                                className={`analytics-flow-point ${directionClass}`}
                            />

                            {movement !== 0 && (
                                <text
                                    x={point.x}
                                    y={movement > 0 ? point.y - 10 : point.y + 18}
                                    textAnchor="middle"
                                    className={`analytics-flow-value ${directionClass}`}
                                >
                                    {sign}{formatNumber(movement)}
                                </text>
                            )}

                            {showLabel && (
                                <text
                                    x={point.x}
                                    y={height - 11}
                                    textAnchor="middle"
                                    className="analytics-axis-label"
                                >
                                    {point.label}
                                </text>
                            )}
                        </g>
                    );
                })}
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
    const [trendRange, setTrendRange] = useState("sevenDays");

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

        const aggregateTrendRange = (range) => {
            const trendMap = new Map();
            list.forEach((module) => {
                (module.trendRanges?.[range] || []).forEach((point) => {
                    const key = point.period || point.day;
                    trendMap.set(
                        key,
                        (trendMap.get(key) || 0) + Number(point.total || 0)
                    );
                });
            });

            const template = list.find((module) => module.trendRanges?.[range]?.length)?.trendRanges?.[range] || [];
            return template.map((point) => ({
                ...point,
                total: trendMap.get(point.period || point.day) || 0
            }));
        };

        const trendRanges = {
            sevenDays: aggregateTrendRange("sevenDays"),
            daily: aggregateTrendRange("daily"),
            monthly: aggregateTrendRange("monthly"),
            yearly: aggregateTrendRange("yearly")
        };

        const trend = trendRanges.sevenDays;

        return {
            total,
            positive,
            negative,
            valueTotal,
            status,
            trend,
            trendRanges,
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

    const trendPoints = view.trendRanges?.[trendRange] || view.trend || [];

    const trendGrowth = useMemo(() => {
        if (trendPoints.length < 2) return 0;
        const midpoint = Math.ceil(trendPoints.length / 2);
        const previous = trendPoints.slice(0, midpoint).reduce(
            (sum, point) => sum + Number(point.total || 0),
            0
        );
        const current = trendPoints.slice(midpoint).reduce(
            (sum, point) => sum + Number(point.total || 0),
            0
        );
        if (previous === 0) return current > 0 ? 100 : 0;
        return Number((((current - previous) / previous) * 100).toFixed(1));
    }, [trendPoints]);

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
                        <div className="analytics-panel-heading analytics-trend-heading">
                            <div>
                                <div className="analytics-panel-kicker">TRENDING FLOW</div>
                                <h2>
                                    {selectedModule ? `${selectedModule.name} Activity` : "MIARCUS Activity"}
                                    <span className="analytics-trend-range-title">
                                        {trendRange === "sevenDays" ? " — Last 7 Days" : trendRange === "daily" ? " — Daily / 30 Days" : trendRange === "monthly" ? " — Monthly / 12 Months" : " — Yearly / 5 Years"}
                                    </span>
                                </h2>
                            </div>
                            <div className="analytics-trend-controls" role="group" aria-label="Trend period">
                                {[
                                    ["sevenDays", "7 Days"],
                                    ["daily", "Per Day"],
                                    ["monthly", "Per Month"],
                                    ["yearly", "Per Year"]
                                ].map(([key, label]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        className={trendRange === key ? "active" : ""}
                                        onClick={() => setTrendRange(key)}
                                        aria-pressed={trendRange === key}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className={`analytics-trend-badge ${trendGrowth >= 0 ? "up" : "down"}`}>
                                {trendGrowth >= 0 ? <FaArrowUp /> : <FaArrowDown />}
                                {trendGrowth > 0 ? "+" : ""}{trendGrowth}%
                            </div>
                        </div>
                        <TrendChart points={trendPoints} range={trendRange} />
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
