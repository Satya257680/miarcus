import PremiumLoader from "../../../components/premium/PremiumLoader";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    FaPause,
    FaPlay,
    FaBolt,
} from "react-icons/fa";

import "../../../styles/dashboard/DashboardAnalytics.css";
import "../../../styles/dashboard/DashboardAnalytics3D.css";

// ======================================================
// SETTINGS
// ======================================================
const PULSE_MS = 5000;        // cheap "anything changed?" check
const FULL_REFRESH_MS = 60000; // safety full refresh while live

const numberFormatter = new Intl.NumberFormat("en-IN");
const formatNumber = (value) => numberFormatter.format(Math.round(Number(value || 0)));

const formatValue = (value) => {
    if (!Number(value)) return "—";
    return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

// Validated categorical order (fixed, never cycled beyond 8 – the rest
// is folded into "Other").
const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const OTHER_COLOR = "#94a3b8";
const UP = "#16a34a";
const DOWN = "#e34948";
const FLAT = "#94a3b8";

const RANGES = [
    ["sevenDays", "7D", "Last 7 Days"],
    ["daily", "30D", "Daily · 30 Days"],
    ["monthly", "12M", "Monthly · 12 Months"],
    ["yearly", "5Y", "Yearly · 5 Years"],
];

// ------------------------------------------------------
// helpers
// ------------------------------------------------------
const shade = (hex, amount) => {
    const value = hex.replace("#", "");
    const num = parseInt(value.length === 3 ? value.split("").map((c) => c + c).join("") : value, 16);
    const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    const mix = amount < 0 ? 0 : 255;
    const t = Math.abs(amount);
    return `#${[r, g, b].map((c) => clamp(c + (mix - c) * t).toString(16).padStart(2, "0")).join("")}`;
};

const foldOther = (items, max = 7) => {
    const sorted = [...(items || [])]
        .map((item) => ({ ...item, total: Number(item.total || 0) }))
        .filter((item) => item.total > 0)
        .sort((a, b) => b.total - a.total);
    if (sorted.length <= max + 1) return sorted.map((item, i) => ({ ...item, color: PALETTE[i] }));
    const head = sorted.slice(0, max).map((item, i) => ({ ...item, color: PALETTE[i] }));
    const rest = sorted.slice(max).reduce((sum, item) => sum + item.total, 0);
    return [...head, { label: "Other", total: rest, color: OTHER_COLOR }];
};

// 0 → 1 easing animation that restarts whenever `key` changes.
function useGrow(key, duration = 900) {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        let frame;
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            setProgress(1 - Math.pow(1 - t, 3));
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        setProgress(0);
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [key, duration]);
    return progress;
}

// Smoothly counts from the previous value to the new one.
function AnimatedNumber({ value, format = formatNumber }) {
    const [shown, setShown] = useState(Number(value || 0));
    const fromRef = useRef(Number(value || 0));
    useEffect(() => {
        const from = fromRef.current;
        const to = Number(value || 0);
        if (from === to) return undefined;
        let frame;
        const start = performance.now();
        const tick = (now) => {
            const t = Math.min((now - start) / 700, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setShown(from + (to - from) * eased);
            if (t < 1) frame = requestAnimationFrame(tick);
            else fromRef.current = to;
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value]);
    return <>{format(shown)}</>;
}

const EmptyChart = ({ icon: Icon, text }) => (
    <div className="analytics-empty-chart">
        <Icon />
        <span>{text}</span>
    </div>
);

// ======================================================
// 3D PIE
// ======================================================
function Pie3D({ items, title = "Distribution" }) {
    const data = useMemo(() => foldOther(items), [items]);
    const total = data.reduce((sum, item) => sum + item.total, 0);
    const [hover, setHover] = useState(null);
    const [rotation, setRotation] = useState(-Math.PI / 2);
    const dragRef = useRef(null);
    const grow = useGrow(data.map((d) => `${d.label}:${d.total}`).join("|"));

    if (!total) return <EmptyChart icon={FaChartPie} text="No distribution data yet" />;

    const W = 340;
    const H = 250;
    const cx = W / 2;
    const cy = 105;
    const rx = 140;
    const ry = 78;
    const depth = 30;

    const point = (angle, y = cy) => [cx + rx * Math.cos(angle), y + ry * Math.sin(angle)];

    const slices = data.reduce((acc, item, index) => {
        const sweep = (item.total / total) * Math.PI * 2 * grow;
        const start = acc.length ? acc[acc.length - 1].end : rotation;
        const end = start + sweep;
        return [...acc, { ...item, index, start, end, mid: (start + end) / 2, pct: (item.total / total) * 100 }];
    }, []);

    const topPath = (s) => {
        const [x1, y1] = point(s.start);
        const [x2, y2] = point(s.end);
        const large = s.end - s.start > Math.PI ? 1 : 0;
        if (s.end - s.start >= Math.PI * 2 - 0.0001) {
            return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} Z`;
        }
        return `M ${cx} ${cy} L ${x1} ${y1} A ${rx} ${ry} 0 ${large} 1 ${x2} ${y2} Z`;
    };

    // Outer wall: only the part of the rim that faces the viewer
    // (sin(angle) > 0) is visible.
    const sidePaths = (s) => {
        const paths = [];
        const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        let a = s.start;
        const end = s.end;
        while (a < end - 1e-6) {
            const base = a - norm(a);
            const next = Math.min(end, base + (norm(a) < Math.PI ? Math.PI : 2 * Math.PI));
            if (norm(a) < Math.PI) {
                const [x1, y1] = point(a);
                const [x2, y2] = point(next);
                paths.push(
                    `M ${x1} ${y1} A ${rx} ${ry} 0 0 1 ${x2} ${y2} L ${x2} ${y2 + depth} A ${rx} ${ry} 0 0 0 ${x1} ${y1 + depth} Z`
                );
            }
            a = next;
        }
        return paths;
    };

    const lift = (s) => {
        if (hover !== s.index) return "";
        return `translate(${Math.cos(s.mid) * 12} ${Math.sin(s.mid) * 7 - 4})`;
    };

    const onPointerDown = (e) => {
        dragRef.current = { x: e.clientX, rotation };
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
        if (!dragRef.current) return;
        setRotation(dragRef.current.rotation + (e.clientX - dragRef.current.x) / 80);
    };
    const onPointerUp = () => { dragRef.current = null; };

    const ordered = [...slices].sort((a, b) => (a.index === hover) - (b.index === hover));
    const active = hover !== null ? slices[hover] : null;

    return (
        <div className="da3-pie-layout">
            <div className="da3-pie-stage">
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="da3-pie-svg"
                    role="img"
                    aria-label={`${title}: ${slices.map((s) => `${s.label} ${s.total}`).join(", ")}`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={() => { onPointerUp(); setHover(null); }}
                >
                    <defs>
                        <radialGradient id="da3-pie-shine" cx="35%" cy="25%" r="75%">
                            <stop offset="0%" stopColor="#fff" stopOpacity="0.38" />
                            <stop offset="60%" stopColor="#fff" stopOpacity="0.05" />
                            <stop offset="100%" stopColor="#000" stopOpacity="0.08" />
                        </radialGradient>
                        <filter id="da3-pie-shadow" x="-20%" y="-20%" width="140%" height="160%">
                            <feGaussianBlur stdDeviation="8" />
                        </filter>
                    </defs>

                    <ellipse cx={cx} cy={cy + depth + 18} rx={rx * 0.92} ry={ry * 0.45} fill="#0f172a" opacity="0.16" filter="url(#da3-pie-shadow)" />

                    {ordered.map((s) => (
                        <g key={`side-${s.label}`} transform={lift(s)} className="da3-slice">
                            {sidePaths(s).map((d, i) => (
                                <path key={i} d={d} fill={shade(s.color, -0.32)} stroke={shade(s.color, -0.4)} strokeWidth="0.6" />
                            ))}
                        </g>
                    ))}

                    {ordered.map((s) => (
                        <g
                            key={`top-${s.label}`}
                            transform={lift(s)}
                            className="da3-slice"
                            onPointerEnter={() => setHover(s.index)}
                            onFocus={() => setHover(s.index)}
                            onBlur={() => setHover(null)}
                            tabIndex={0}
                        >
                            <path d={topPath(s)} fill={s.color} stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
                            <path d={topPath(s)} fill="url(#da3-pie-shine)" pointerEvents="none" />
                        </g>
                    ))}
                </svg>

                <div className={`da3-pie-center ${active ? "show" : ""}`}>
                    {active ? (
                        <>
                            <span className="da3-dot" style={{ background: active.color }} />
                            <strong>{active.label}</strong>
                            <b>{formatNumber(active.total)}</b>
                            <small>{active.pct.toFixed(1)}% of {formatNumber(total)}</small>
                        </>
                    ) : null}
                </div>
                <div className="da3-hint">Drag to rotate · hover a slice</div>
            </div>

            <div className="da3-legend">
                <div className="da3-legend-total">
                    <span>Total</span>
                    <strong><AnimatedNumber value={total} /></strong>
                </div>
                {slices.map((s) => (
                    <button
                        type="button"
                        key={s.label}
                        className={`da3-legend-row ${hover === s.index ? "active" : ""}`}
                        onMouseEnter={() => setHover(s.index)}
                        onMouseLeave={() => setHover(null)}
                    >
                        <span className="da3-dot" style={{ background: s.color }} />
                        <span className="da3-legend-label" title={s.label}>{s.label}</span>
                        <strong>{formatNumber(s.total)}</strong>
                        <em>{((s.total / total) * 100).toFixed(1)}%</em>
                    </button>
                ))}
            </div>
        </div>
    );
}

// ======================================================
// 3D BAR
// ======================================================
function Bar3D({ items, onSelect }) {
    const data = useMemo(() => foldOther(items, 8).slice(0, 9), [items]);
    const [hover, setHover] = useState(null);
    const grow = useGrow(data.map((d) => `${d.label}:${d.total}`).join("|"));

    if (!data.length) return <EmptyChart icon={FaChartBar} text="No data to compare yet" />;

    const W = 560;
    const H = 290;
    const left = 44;
    const bottom = 62;
    const top = 26;
    const dx = 14;
    const dy = -9;
    const plotW = W - left - 20 - dx;
    const plotH = H - bottom - top;
    const max = Math.max(...data.map((d) => d.total), 1);
    const niceMax = (() => {
        const pow = Math.pow(10, Math.floor(Math.log10(max)));
        const n = max / pow;
        return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
    })();
    const slot = plotW / data.length;
    const barW = Math.min(46, slot * 0.56);
    const baseY = top + plotH;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * niceMax);
    const active = hover !== null ? data[hover] : null;

    return (
        <div className="da3-bar-wrap">
            <svg viewBox={`0 0 ${W} ${H}`} className="da3-bar-svg" role="img" aria-label={data.map((d) => `${d.label} ${d.total}`).join(", ")}>
                <defs>
                    <linearGradient id="da3-wall" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#eef2ff" />
                        <stop offset="100%" stopColor="#f8fafc" />
                    </linearGradient>
                </defs>

                {/* back wall + floor */}
                <path d={`M ${left + dx} ${top + dy} L ${left + dx + plotW} ${top + dy} L ${left + dx + plotW} ${baseY + dy} L ${left + dx} ${baseY + dy} Z`} fill="url(#da3-wall)" />
                <path d={`M ${left} ${baseY} L ${left + dx} ${baseY + dy} L ${left + dx + plotW} ${baseY + dy} L ${left + plotW} ${baseY} Z`} fill="#e2e8f0" />

                {ticks.map((t) => {
                    const y = baseY - (t / niceMax) * plotH;
                    return (
                        <g key={t}>
                            <path d={`M ${left} ${y} L ${left + dx} ${y + dy} L ${left + dx + plotW} ${y + dy}`} className="da3-grid" />
                            <text x={left - 8} y={y + 4} textAnchor="end" className="da3-axis">{formatNumber(t)}</text>
                        </g>
                    );
                })}

                {data.map((d, i) => {
                    const h = Math.max((d.total / niceMax) * plotH * grow, d.total ? 3 : 0);
                    const x = left + slot * i + (slot - barW) / 2;
                    const y = baseY - h;
                    const isHover = hover === i;
                    const color = d.color;
                    return (
                        <g
                            key={d.label}
                            className={`da3-bar ${isHover ? "hover" : ""} ${hover !== null && !isHover ? "dim" : ""}`}
                            onMouseEnter={() => setHover(i)}
                            onMouseLeave={() => setHover(null)}
                            onClick={() => onSelect?.(d)}
                            style={{ cursor: onSelect && d.key ? "pointer" : "default" }}
                        >
                            {/* hit target bigger than the mark */}
                            <rect x={left + slot * i} y={top + dy} width={slot} height={plotH - dy} fill="transparent" />
                            <path d={`M ${x + barW} ${y} L ${x + barW + dx} ${y + dy} L ${x + barW + dx} ${baseY + dy} L ${x + barW} ${baseY} Z`} fill={shade(color, -0.3)} />
                            <path d={`M ${x} ${y} L ${x + dx} ${y + dy} L ${x + barW + dx} ${y + dy} L ${x + barW} ${y} Z`} fill={shade(color, 0.28)} />
                            <rect x={x} y={y} width={barW} height={h} fill={color} />
                            <rect x={x} y={y} width={barW * 0.28} height={h} fill="#ffffff" opacity="0.14" />
                            {(isHover || data.length <= 6) && d.total > 0 && (
                                <text x={x + barW / 2 + dx / 2} y={y + dy - 6} textAnchor="middle" className="da3-bar-value">{formatNumber(d.total)}</text>
                            )}
                            <text
                                x={x + barW / 2}
                                y={baseY + 18}
                                textAnchor="end"
                                transform={`rotate(-28 ${x + barW / 2} ${baseY + 18})`}
                                className="da3-axis da3-bar-label"
                            >
                                {d.label.length > 16 ? `${d.label.slice(0, 15)}…` : d.label}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {active && (
                <div className="da3-tooltip da3-bar-tip">
                    <span className="da3-dot" style={{ background: active.color }} />
                    <b>{active.label}</b>
                    <strong>{formatNumber(active.total)}</strong>
                    {active.key && <small>Click to analyze</small>}
                </div>
            )}
        </div>
    );
}

// ======================================================
// TRADING CHART (candles / line / area + MA + volume)
// ======================================================
// Measures an element's width so SVG text is drawn at real pixel size
// (no stretched labels).
function useWidth(ref, fallback = 900) {
    const [width, setWidth] = useState(fallback);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === "undefined") return undefined;
        const observer = new ResizeObserver(([entry]) => {
            const next = Math.round(entry.contentRect.width);
            if (next > 0) setWidth(next);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [ref]);
    return width;
}

function TradingChart({ points, mode, live, rangeLabel }) {
    const wrapRef = useRef(null);
    const measured = useWidth(wrapRef);
    const [cross, setCross] = useState(null);
    const grow = useGrow(`${mode}|${points.map((p) => p.total).join(",")}`, 700);

    const candles = useMemo(() => points.map((p, i) => {
        const close = Number(p.total || 0);
        const open = i === 0 ? close : Number(points[i - 1].total || 0);
        const change = close - open;
        const pct = open === 0 ? (close > 0 ? 100 : 0) : (change / open) * 100;
        return {
            label: p.label || p.period || p.day,
            open,
            close,
            high: Math.max(open, close),
            low: Math.min(open, close),
            change,
            pct,
        };
    }), [points]);

    if (!candles.length) {
        return <div ref={wrapRef}><EmptyChart icon={FaChartLine} text="No trend data yet" /></div>;
    }

    const W = Math.max(measured, 320);
    const H = W < 600 ? 280 : 360;
    const padL = 16;
    const padR = 64;
    const padT = 18;
    const volH = 58;
    const gap = 26;
    const priceH = H - padT - volH - gap - 24;
    const plotW = W - padL - padR;
    const values = candles.flatMap((c) => [c.high, c.low]);
    const vMax = Math.max(...values, 1);
    const vMin = 0;
    const span = vMax - vMin || 1;
    const top = vMax + span * 0.12;
    const yOf = (v) => padT + priceH - ((v - vMin) / (top - vMin)) * priceH * grow;
    const step = plotW / candles.length;
    const xOf = (i) => padL + step * i + step / 2;
    const bodyW = Math.max(Math.min(step * 0.6, 26), 3);
    const volTop = padT + priceH + gap;
    const volMax = Math.max(...candles.map((c) => Math.abs(c.change)), 1);

    // 3-period moving average
    const ma = candles.map((_, i) => {
        const slice = candles.slice(Math.max(0, i - 2), i + 1);
        return slice.reduce((s, c) => s + c.close, 0) / slice.length;
    });

    const linePath = candles.map((c, i) => `${i ? "L" : "M"} ${xOf(i)} ${yOf(c.close)}`).join(" ");
    const areaPath = `${linePath} L ${xOf(candles.length - 1)} ${padT + priceH} L ${xOf(0)} ${padT + priceH} Z`;
    const maPath = ma.map((v, i) => `${i ? "L" : "M"} ${xOf(i)} ${yOf(v)}`).join(" ");
    const last = candles[candles.length - 1];
    const lastUp = last.change >= 0;
    const labelEvery = Math.ceil(candles.length / 10);
    const gridValues = [0, 0.25, 0.5, 0.75, 1].map((t) => vMin + t * (top - vMin));

    const onMove = (e) => {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = ((e.clientX - rect.left) / rect.width) * W;
        const i = Math.min(Math.max(Math.floor((x - padL) / step), 0), candles.length - 1);
        setCross({ i, left: (xOf(i) / W) * 100 });
    };

    const hovered = cross ? candles[cross.i] : null;

    return (
        <div className="da3-trade" ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setCross(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} className="da3-trade-svg" style={{ height: H }} role="img" aria-label={`Activity ${rangeLabel}`}>
                <defs>
                    <linearGradient id="da3-area-up" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lastUp ? UP : DOWN} stopOpacity="0.28" />
                        <stop offset="100%" stopColor={lastUp ? UP : DOWN} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {gridValues.map((v) => (
                    <g key={v}>
                        <line x1={padL} x2={W - padR} y1={yOf(v)} y2={yOf(v)} className="da3-grid" />
                        <text x={W - padR + 8} y={yOf(v) + 4} className="da3-axis">{formatNumber(v)}</text>
                    </g>
                ))}

                {(mode === "area" || mode === "line") && (
                    <>
                        {mode === "area" && <path d={areaPath} fill="url(#da3-area-up)" />}
                        <path d={linePath} fill="none" stroke={lastUp ? UP : DOWN} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
                        {candles.map((c, i) => (
                            <circle key={i} cx={xOf(i)} cy={yOf(c.close)} r={cross?.i === i ? 5 : 3} fill="#fff" stroke={c.change > 0 ? UP : c.change < 0 ? DOWN : FLAT} strokeWidth="2" />
                        ))}
                    </>
                )}

                {mode === "candles" && candles.map((c, i) => {
                    const color = c.change > 0 ? UP : c.change < 0 ? DOWN : FLAT;
                    const yTop = yOf(c.high);
                    const yBot = yOf(c.low);
                    const h = Math.max(yBot - yTop, 2);
                    const x = xOf(i);
                    const isLast = i === candles.length - 1;
                    return (
                        <g key={i} className={isLast && live ? "da3-candle-live" : ""}>
                            <rect x={x - bodyW / 2 + 2} y={yTop + 2} width={bodyW} height={h} rx="2" fill={shade(color, -0.35)} opacity="0.45" />
                            <rect x={x - bodyW / 2} y={yTop} width={bodyW} height={h} rx="2" fill={color} />
                            <rect x={x - bodyW / 2} y={yTop} width={bodyW * 0.35} height={h} rx="2" fill="#fff" opacity="0.18" />
                        </g>
                    );
                })}

                <path d={maPath} fill="none" stroke="#4a3aa7" strokeWidth="1.6" strokeDasharray="5 4" opacity="0.85" />

                {/* volume = size of the move */}
                {candles.map((c, i) => {
                    const h = (Math.abs(c.change) / volMax) * volH * grow;
                    const color = c.change > 0 ? UP : c.change < 0 ? DOWN : FLAT;
                    return <rect key={`v${i}`} x={xOf(i) - bodyW / 2} y={volTop + volH - h} width={bodyW} height={Math.max(h, 1)} rx="2" fill={color} opacity="0.45" />;
                })}
                <line x1={padL} x2={W - padR} y1={volTop + volH} y2={volTop + volH} className="da3-grid" />

                {candles.map((c, i) => (i % labelEvery === 0 || i === candles.length - 1) && (
                    <text key={`l${i}`} x={xOf(i)} y={H - 6} textAnchor="middle" className="da3-axis">{c.label}</text>
                ))}

                {/* last price tag, like a trading terminal */}
                <line x1={padL} x2={W - padR} y1={yOf(last.close)} y2={yOf(last.close)} stroke={lastUp ? UP : DOWN} strokeDasharray="3 3" strokeWidth="1" opacity="0.8" />
                <g>
                    <rect x={W - padR + 2} y={yOf(last.close) - 10} width={padR - 4} height="20" rx="4" fill={lastUp ? UP : DOWN} />
                    <text x={W - padR / 2} y={yOf(last.close) + 4} textAnchor="middle" className="da3-price-tag">{formatNumber(last.close)}</text>
                </g>

                {cross && (
                    <line x1={xOf(cross.i)} x2={xOf(cross.i)} y1={padT} y2={volTop + volH} className="da3-crosshair" />
                )}
            </svg>

            {hovered && (
                <div className={`da3-tooltip da3-trade-tip ${cross.left > 70 ? "flip" : ""}`} style={{ left: `${cross.left}%` }}>
                    <b>{hovered.label}</b>
                    <div><span>Open</span><strong>{formatNumber(hovered.open)}</strong></div>
                    <div><span>Close</span><strong>{formatNumber(hovered.close)}</strong></div>
                    <div><span>Change</span><strong className={hovered.change > 0 ? "up" : hovered.change < 0 ? "down" : ""}>{hovered.change > 0 ? "+" : ""}{formatNumber(hovered.change)} ({hovered.pct > 0 ? "+" : ""}{hovered.pct.toFixed(1)}%)</strong></div>
                    <div><span>MA(3)</span><strong>{formatNumber(ma[cross.i])}</strong></div>
                </div>
            )}
        </div>
    );
}

// ======================================================
// PAGE
// ======================================================
function DashboardAnalytics() {
    const [modules, setModules] = useState([]);
    const [selectedKey, setSelectedKey] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);
    const [trendRange, setTrendRange] = useState("sevenDays");
    const [chartMode, setChartMode] = useState("candles");
    const [live, setLive] = useState(true);
    const [pulse, setPulse] = useState(null);
    const [flash, setFlash] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    const signatureRef = useRef(null);
    const loadingRef = useRef(false);

    const loadAnalytics = useCallback(async ({ fresh = false, silent = false } = {}) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        if (!silent) setLoading(true);
        setError("");
        try {
            const response = await axios.get("/api/dashboard/analytics", {
                params: { _ts: Date.now(), ...(fresh ? { fresh: 1 } : {}) },
                headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
            });
            const data = response?.data?.data;
            setModules(Array.isArray(data) ? data : []);
            setLastUpdated(new Date());
            if (silent) {
                setFlash(true);
                window.setTimeout(() => setFlash(false), 1200);
            }
        } catch (requestError) {
            console.error("Dashboard analytics:", requestError);
            if (!silent) {
                setError(requestError?.response?.data?.message || "Unable to load analytics. Please try again.");
            }
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    // ---------- REAL TIME ----------
    useEffect(() => {
        if (!live) return undefined;
        let alive = true;

        const checkPulse = async () => {
            if (document.hidden) return;
            try {
                const { data } = await axios.get("/api/dashboard/pulse", { params: { _ts: Date.now() } });
                if (!alive || !data?.data) return;
                setPulse(data.data);
                const signature = data.data.signature;
                if (signatureRef.current && signature !== signatureRef.current) {
                    loadAnalytics({ fresh: true, silent: true });
                }
                signatureRef.current = signature;
            } catch {
                // Older API without /pulse – the full refresh below still keeps it live.
            }
        };

        checkPulse();
        const pulseTimer = window.setInterval(checkPulse, PULSE_MS);
        const fullTimer = window.setInterval(() => !document.hidden && loadAnalytics({ silent: true }), FULL_REFRESH_MS);
        const onVisible = () => !document.hidden && checkPulse();
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            alive = false;
            window.clearInterval(pulseTimer);
            window.clearInterval(fullTimer);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [live, loadAnalytics]);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    const list = useMemo(() => modules.filter((module) => module.key !== "dashboard"), [modules]);

    const selectedModule = useMemo(() => {
        if (selectedKey === "all") return null;
        return modules.find((module) => module.key === selectedKey) || null;
    }, [modules, selectedKey]);

    const overview = useMemo(() => {
        const total = list.reduce((sum, module) => sum + Number(module.total || 0), 0);
        const positive = list.filter((module) => Number(module.change || 0) > 0).length;
        const negative = list.filter((module) => Number(module.change || 0) < 0).length;
        const valueTotal = list.reduce((sum, module) => sum + Number(module.valueTotal || 0), 0);

        const statusMap = new Map();
        list.forEach((module) => {
            (module.status || []).forEach((item) => {
                statusMap.set(item.label, (statusMap.get(item.label) || 0) + Number(item.total || 0));
            });
        });
        const status = Array.from(statusMap.entries())
            .map(([label, count]) => ({ label, total: count }))
            .sort((a, b) => b.total - a.total);

        const aggregateTrendRange = (range) => {
            const trendMap = new Map();
            list.forEach((module) => {
                (module.trendRanges?.[range] || []).forEach((point) => {
                    const key = point.period || point.day;
                    trendMap.set(key, (trendMap.get(key) || 0) + Number(point.total || 0));
                });
            });
            const template = list.find((module) => module.trendRanges?.[range]?.length)?.trendRanges?.[range] || [];
            return template.map((point) => ({ ...point, total: trendMap.get(point.period || point.day) || 0 }));
        };

        const trendRanges = Object.fromEntries(RANGES.map(([key]) => [key, aggregateTrendRange(key)]));

        return {
            total,
            positive,
            negative,
            valueTotal,
            status,
            trend: trendRanges.sevenDays,
            trendRanges,
            moduleCount: list.length,
        };
    }, [list]);

    const view = selectedModule || overview;
    const topStatus = [...(view.status || [])].sort((a, b) => b.total - a.total)[0];

    const growth = selectedModule
        ? Number(selectedModule.change || 0)
        : list.length
            ? Number((list.reduce((sum, module) => sum + Number(module.change || 0), 0) / Math.max(overview.moduleCount, 1)).toFixed(1))
            : 0;

    const trendPoints = useMemo(
        () => view.trendRanges?.[trendRange] || view.trend || [],
        [view, trendRange]
    );

    const ticker = useMemo(() => {
        const totals = trendPoints.map((p) => Number(p.total || 0));
        const sum = totals.reduce((s, v) => s + v, 0);
        const last = totals[totals.length - 1] || 0;
        const prev = totals[totals.length - 2] || 0;
        const change = last - prev;
        const pct = prev === 0 ? (last > 0 ? 100 : 0) : (change / prev) * 100;
        return {
            sum,
            last,
            change,
            pct: Number(pct.toFixed(1)),
            high: totals.length ? Math.max(...totals) : 0,
            low: totals.length ? Math.min(...totals) : 0,
        };
    }, [trendPoints]);

    const barItems = selectedModule
        ? (selectedModule.status || [])
        : list.map((module) => ({ key: module.key, label: module.name, total: Number(module.total || 0) }));

    const rangeInfo = RANGES.find(([key]) => key === trendRange) || RANGES[0];
    const secondsAgo = lastUpdated ? Math.max(0, Math.round((now - lastUpdated.getTime()) / 1000)) : null;

    return (
        <div className="dashboard-analytics-page da3-page">
            <section className="analytics-hero">
                <div>
                    <div className="analytics-eyebrow">
                        <FaTachometerAlt /> MIARCUS BUSINESS INTELLIGENCE
                        <span className={`da3-live ${live ? "on" : "off"} ${flash ? "flash" : ""}`}>
                            <i /> {live ? "LIVE" : "PAUSED"}
                        </span>
                    </div>
                    <h1>Dashboard Analytics</h1>
                    <p>
                        Real-time 3D view of every MIARCUS module — status distribution,
                        module comparison and a trading-style activity chart that updates as
                        work happens.
                    </p>
                </div>

                <div className="analytics-hero-actions">
                    <label className="analytics-module-select">
                        <span>ANALYZE MODULE</span>
                        <select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
                            <option value="all">All Modules — Overview</option>
                            {list.map((module) => (
                                <option key={module.key} value={module.key}>{module.name}</option>
                            ))}
                        </select>
                    </label>

                    <button
                        type="button"
                        className="analytics-refresh da3-live-toggle"
                        onClick={() => setLive((value) => !value)}
                        title={live ? "Pause real-time updates" : "Resume real-time updates"}
                    >
                        {live ? <FaPause /> : <FaPlay />} {live ? "Pause" : "Go Live"}
                    </button>

                    <button
                        type="button"
                        className="analytics-refresh"
                        onClick={() => loadAnalytics({ fresh: true })}
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
                    <PremiumLoader compact title="Loading business analytics" />
                </div>
            ) : (
                <>
                    <section className="analytics-kpi-grid">
                        <article className="analytics-kpi-card teal da3-kpi">
                            <div className="analytics-kpi-icon"><FaDatabase /></div>
                            <div>
                                <span>Total Records</span>
                                <strong><AnimatedNumber value={view.total} /></strong>
                                <small>{selectedModule ? selectedModule.name : `${overview.moduleCount} modules analyzed`}</small>
                            </div>
                        </article>

                        <article className="analytics-kpi-card green da3-kpi">
                            <div className="analytics-kpi-icon"><FaCheckCircle /></div>
                            <div>
                                <span>Top Status</span>
                                <strong className="analytics-kpi-status">{topStatus ? <AnimatedNumber value={topStatus.total} /> : "—"}</strong>
                                <small>{topStatus?.label || "No status data"}</small>
                            </div>
                        </article>

                        <article className={`analytics-kpi-card ${growth >= 0 ? "blue" : "red"} da3-kpi`}>
                            <div className="analytics-kpi-icon">{growth >= 0 ? <FaArrowUp /> : <FaArrowDown />}</div>
                            <div>
                                <span>Movement</span>
                                <strong>{growth > 0 ? "+" : ""}{growth}%</strong>
                                <small>Recent activity trend</small>
                            </div>
                        </article>

                        <article className="analytics-kpi-card purple da3-kpi">
                            <div className="analytics-kpi-icon">{pulse ? <FaBolt /> : <FaLayerGroup />}</div>
                            <div>
                                <span>{pulse ? "Live Today" : "Tracked Value"}</span>
                                <strong>{pulse ? <AnimatedNumber value={pulse.today} /> : formatValue(view.valueTotal)}</strong>
                                <small>{pulse ? `${formatNumber(pulse.last_hour)} actions in the last hour` : "Across measurable modules"}</small>
                            </div>
                        </article>
                    </section>

                    <section className="analytics-chart-grid da3-chart-grid">
                        <article className="analytics-panel da3-panel">
                            <div className="analytics-panel-heading">
                                <div>
                                    <div className="analytics-panel-kicker">STATUS INTELLIGENCE · 3D PIE</div>
                                    <h2>{selectedModule ? `${selectedModule.name} Status` : "Status Distribution"}</h2>
                                </div>
                                <div className="analytics-panel-icon pie"><FaChartPie /></div>
                            </div>
                            <Pie3D items={view.status || []} title="Status distribution" />
                        </article>

                        <article className="analytics-panel da3-panel">
                            <div className="analytics-panel-heading">
                                <div>
                                    <div className="analytics-panel-kicker">COMPARATIVE VIEW · 3D BAR</div>
                                    <h2>{selectedModule ? "Status Performance" : "Records by Module"}</h2>
                                </div>
                                <div className="analytics-panel-icon bar"><FaChartBar /></div>
                            </div>
                            <Bar3D
                                items={barItems}
                                onSelect={selectedModule ? undefined : (item) => item.key && setSelectedKey(item.key)}
                            />
                        </article>
                    </section>

                    <section className="analytics-panel da3-trade-panel">
                        <div className="da3-trade-head">
                            <div className="da3-symbol">
                                <div className="analytics-panel-kicker">ACTIVITY MARKET · {rangeInfo[2].toUpperCase()}</div>
                                <h2>
                                    {selectedModule ? selectedModule.name.toUpperCase() : "MIARCUS"}
                                    <span className="da3-symbol-sub">/ ACTIVITY</span>
                                </h2>
                                <div className="da3-quote">
                                    <strong><AnimatedNumber value={ticker.last} /></strong>
                                    <span className={ticker.change > 0 ? "up" : ticker.change < 0 ? "down" : "flat"}>
                                        {ticker.change > 0 ? <FaArrowUp /> : ticker.change < 0 ? <FaArrowDown /> : null}
                                        {ticker.change > 0 ? "+" : ""}{formatNumber(ticker.change)} ({ticker.pct > 0 ? "+" : ""}{ticker.pct}%)
                                    </span>
                                </div>
                            </div>

                            <div className="da3-stats-row">
                                <div><span>High</span><b>{formatNumber(ticker.high)}</b></div>
                                <div><span>Low</span><b>{formatNumber(ticker.low)}</b></div>
                                <div><span>Volume</span><b>{formatNumber(ticker.sum)}</b></div>
                            </div>

                            <div className="da3-controls">
                                <div className="da3-seg" role="group" aria-label="Period">
                                    {RANGES.map(([key, label]) => (
                                        <button key={key} type="button" className={trendRange === key ? "active" : ""} onClick={() => setTrendRange(key)} aria-pressed={trendRange === key}>{label}</button>
                                    ))}
                                </div>
                                <div className="da3-seg" role="group" aria-label="Chart type">
                                    {[["candles", "Candles"], ["line", "Line"], ["area", "Area"]].map(([key, label]) => (
                                        <button key={key} type="button" className={chartMode === key ? "active" : ""} onClick={() => setChartMode(key)} aria-pressed={chartMode === key}>{label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="da3-trade-legend">
                            <span><i style={{ background: UP }} /> Up (more than previous)</span>
                            <span><i style={{ background: DOWN }} /> Down</span>
                            <span><i className="dash" /> Moving avg (3)</span>
                            <span><i style={{ background: FLAT }} /> Volume = size of move</span>
                        </div>

                        <TradingChart points={trendPoints} mode={chartMode} live={live} rangeLabel={rangeInfo[2]} />

                        {pulse?.latest?.length > 0 && (
                            <div className="da3-tape" aria-label="Latest activity">
                                <span className="da3-tape-label"><FaBolt /> LIVE FEED</span>
                                <div className="da3-tape-track">
                                    <div className="da3-tape-inner">
                                        {[...pulse.latest, ...pulse.latest].map((item, index) => (
                                            <span key={`${item.id}-${index}`} className="da3-tape-item">
                                                <b>{item.module_name || "System"}</b> {item.title}
                                                {item.created_by_name ? <em> · {item.created_by_name}</em> : null}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
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
                            {list.map((module) => {
                                const isSelected = selectedKey === module.key;
                                const positive = Number(module.change || 0) >= 0;
                                const spark = module.trend || [];
                                const sparkMax = Math.max(...spark.map((p) => Number(p.total || 0)), 1);

                                return (
                                    <button
                                        type="button"
                                        className={`analytics-module-card da3-module-card ${isSelected ? "selected" : ""}`}
                                        key={module.key}
                                        onClick={() => setSelectedKey(isSelected ? "all" : module.key)}
                                    >
                                        <div className="analytics-module-card-top">
                                            <span className="analytics-module-mini-icon"><FaLayerGroup /></span>
                                            <span className={`analytics-direction ${positive ? "up" : "down"}`}>
                                                {positive ? <FaArrowUp /> : <FaArrowDown />}
                                                {Math.abs(Number(module.change || 0))}%
                                            </span>
                                        </div>
                                        <strong>{module.name}</strong>
                                        <b><AnimatedNumber value={module.total} /></b>
                                        <span className="analytics-module-subtitle">
                                            {module.status?.[0] ? `${module.status[0].label}: ${formatNumber(module.status[0].total)}` : "No status breakdown"}
                                        </span>
                                        <svg className="da3-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
                                            {spark.length > 1 && (
                                                <polyline
                                                    fill="none"
                                                    stroke={positive ? UP : DOWN}
                                                    strokeWidth="2"
                                                    strokeLinejoin="round"
                                                    vectorEffect="non-scaling-stroke"
                                                    points={spark.map((p, i) => `${(i / (spark.length - 1)) * 100},${28 - (Number(p.total || 0) / sparkMax) * 24}`).join(" ")}
                                                />
                                            )}
                                        </svg>
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
                                <strong>Real-time Coverage</strong>
                                <span>{live ? `Checking for new activity every ${PULSE_MS / 1000}s — charts redraw the moment data changes.` : "Live updates are paused. Press Go Live to resume."}</span>
                            </div>
                        </article>
                    </section>
                </>
            )}

            <div className="analytics-footer">
                <span>
                    {lastUpdated
                        ? `Last updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}${secondsAgo !== null ? ` · ${secondsAgo}s ago` : ""}`
                        : "Waiting for analytics data"}
                </span>
                <span>MIARCUS Business Analytics</span>
            </div>
        </div>
    );
}

export default DashboardAnalytics;
