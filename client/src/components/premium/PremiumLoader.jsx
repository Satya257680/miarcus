import { useEffect, useState } from "react";
import { FaCheck } from "react-icons/fa";

import leftArt from "../../assets/premium/loader-left.png";
import rightArt from "../../assets/premium/loader-right.png";
import logoTile from "../../assets/premium/loader-logo.png";
import step1 from "../../assets/premium/loader-step-1.png";
import step2 from "../../assets/premium/loader-step-2.png";
import step3 from "../../assets/premium/loader-step-3.png";
import step4 from "../../assets/premium/loader-step-4.png";
import bulb from "../../assets/premium/loader-bulb.png";

import "../../styles/premium/PremiumLoader.css";

// ======================================================
// MIARCUS PREMIUM LOADER
// ======================================================
//
// The one loading screen used everywhere in the portal
// (pages, tables, modals and bulk uploads):
//
//   <PremiumLoader />                               page loading
//   <PremiumLoader compact title="Loading stores" />  inside a card/table
//   <PremiumLoader overlay />                        full-screen overlay
//   <PremiumLoader progress={68} processed={12456} total={18320} />
//                                                    real progress (bulk upload)
//
// Without `progress` the bar advances on its own (never reaching
// 100%) so the person always sees movement while data loads.
// ======================================================

const STEPS = [
    { icon: step1, label: ["Fetching", "Data"] },
    { icon: step2, label: ["Processing", "Information"] },
    { icon: step3, label: ["Generating", "Reports"] },
    { icon: step4, label: ["Almost", "Ready"] },
];

const stepFor = (percent) => {
    if (percent >= 80) return 3;
    if (percent >= 50) return 2;
    if (percent >= 25) return 1;
    return 0;
};

const captionFor = (step) => [
    "Fetching your data... please do not close this page.",
    "Processing information... please do not close this page.",
    "Generating your reports... please do not close this page.",
    "Almost ready... finishing the last few details.",
][step];

const formatNumber = (value) =>
    Number(value || 0).toLocaleString("en-IN");

function PremiumLoader({
    title = "Processing Your Data...",
    message = "Please wait while we prepare your reports. This may take a few moments.",
    progress,
    processed,
    total,
    unit = "records",
    caption,
    tipTitle = "Almost there!",
    tip = "We're organizing your data to give you the most accurate and meaningful insights.",
    compact = false,
    overlay = false,
    className = "",
}) {
    const controlled = Number.isFinite(Number(progress)) && progress !== null && progress !== undefined;
    const [auto, setAuto] = useState(6);

    useEffect(() => {
        if (controlled) return undefined;
        const timer = setInterval(() => {
            setAuto((current) => {
                if (current >= 94) return current;
                const step = Math.max(0.6, (94 - current) * 0.07);
                return Math.min(94, current + step);
            });
        }, 260);
        return () => clearInterval(timer);
    }, [controlled]);

    const percent = Math.max(0, Math.min(100, Math.round(controlled ? Number(progress) : auto)));
    const active = stepFor(percent);
    const done = percent >= 100;
    const hasCount = Number(total) > 0;

    const body = (
        <div
            className={`pl-root ${compact ? "pl-compact" : ""} ${overlay ? "pl-in-overlay" : ""} ${className}`}
            role="status"
            aria-live="polite"
            aria-label={title}
        >
            <span className="pl-blob pl-blob-a" />
            <span className="pl-blob pl-blob-b" />
            <span className="pl-blob pl-blob-c" />

            <img className="pl-art pl-art-left" src={leftArt} alt="" draggable="false" />
            <img className="pl-art pl-art-right" src={rightArt} alt="" draggable="false" />

            <div className="pl-center">
                <img className="pl-logo" src={logoTile} alt="mi arcus" draggable="false" />

                <div className="pl-brand">MIARCUS</div>
                <div className="pl-tagline">Retail operations, all in one place</div>
                <div className="pl-divider"><span /></div>

                <h2 className="pl-title">{title}</h2>
                {message && <p className="pl-message">{message}</p>}

                <div className="pl-steps">
                    {STEPS.map((stepItem, index) => {
                        const isDone = done || index < active;
                        const isActive = !done && index === active;
                        return (
                            <div
                                key={stepItem.label.join(" ")}
                                className={`pl-step ${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}`}
                            >
                                {index > 0 && <span className={`pl-link pl-link-${index}`} />}
                                <div className="pl-step-icon">
                                    <img src={stepItem.icon} alt="" draggable="false" />
                                    {isActive && <span className="pl-step-ring" />}
                                </div>
                                <div className="pl-step-label">
                                    {stepItem.label[0]}
                                    <br />
                                    {stepItem.label[1]}
                                </div>
                                <div className="pl-step-state">
                                    {isDone ? (
                                        <span className="pl-check"><FaCheck /></span>
                                    ) : isActive ? (
                                        <span className="pl-dots">
                                            {Array.from({ length: 8 }).map((_, dot) => (
                                                <i key={dot} style={{ "--i": dot }} />
                                            ))}
                                        </span>
                                    ) : (
                                        <span className="pl-wait" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="pl-count">
                    {percent}%
                    {hasCount && (
                        <>
                            {" "}— {formatNumber(processed)} of {formatNumber(total)} {unit}
                        </>
                    )}
                </div>
                <div className="pl-bar">
                    <span style={{ width: `${percent}%` }} />
                </div>
                <div className="pl-caption">{caption || captionFor(done ? 3 : active)}</div>

                {tip && (
                    <div className="pl-tip">
                        <img src={bulb} alt="" draggable="false" />
                        <div>
                            <b>{tipTitle}</b>
                            <span>{tip}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (overlay) {
        return <div className="pl-overlay">{body}</div>;
    }

    return body;
}

export default PremiumLoader;
