import { useEffect, useMemo, useRef, useState } from "react";
import {
    FaArrowLeft,
    FaStore,
    FaBuilding,
    FaUserTie,
    FaCalendarAlt,
    FaPowerOff,
    FaClock,
    FaSignInAlt,
    FaSignOutAlt,
    FaMapMarkerAlt,
    FaCrosshairs,
    FaDownload,
    FaExpand,
    FaCheckCircle,
    FaTimesCircle,
    FaUser,
    FaRoute,
    FaHourglassHalf,
    FaGlobeAsia,
    FaCommentDots,
    FaCamera,
    FaChevronRight,
    FaExclamationTriangle,
} from "react-icons/fa";
import { initials, avatarTone } from "../../utils/premiumFormat";
import { getAttendancePhotoAccess, downloadAttendancePhoto } from "../../services/attendanceService.js";
import "../../styles/attendance/AttendanceDetails.css";
import usePunchPlace, { placeLabel } from "../../hooks/usePunchPlace";
import { storeMatchesPlace } from "../../utils/reverseGeocode";

// ==========================================================
// ATTENDANCE DETAILS SHEET
// ----------------------------------------------------------
// Opened from Attendance Reports → "View". Three app-style
// screens (like a native app), with a back arrow between them:
//
//   1. Attendance Details  – employee card, day stats, timeline
//   2. Check In / Check Out Details – selfie + punch information
//   3. Location Details    – live map + coordinates / accuracy
//
// Phones: full-screen sheet. Laptop / desktop: centered panel.
// ==========================================================

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "YYYY-MM-DD HH:mm:ss" (server wall-clock) → Date (local, no TZ shift)
const parseLocal = (value) => {
    if (!value) return null;
    const [d, t = "00:00:00"] = String(value).replace("T", " ").split(" ");
    const [y, m, day] = d.split("-").map(Number);
    const [hh, mm, ss] = t.split(":").map(Number);
    if (!y || !m || !day) return null;
    return new Date(y, m - 1, day, hh || 0, mm || 0, ss || 0);
};

const fmtDate = (value) => {
    const date = parseLocal(value);
    if (!date) return "—";
    return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const fmtTime = (value) => {
    const date = parseLocal(value);
    if (!date || !String(value).includes(":")) return "—";
    let h = date.getHours();
    const suffix = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${String(h).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} ${suffix}`;
};

const minutesBetween = (a, b) => {
    const from = parseLocal(a);
    const to = parseLocal(b);
    if (!from || !to) return null;
    const minutes = Math.round((to - from) / 60000);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
};

const fmtDuration = (minutes) =>
    minutes == null ? "—" : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;

// Straight-line distance between check-in and check-out points
const distanceKm = (lat1, lng1, lat2, lng2) => {
    const values = [lat1, lng1, lat2, lng2].map(Number);
    if (values.some((v) => !Number.isFinite(v)) || values.every((v) => v === 0)) return null;
    const [aLat, aLng, bLat, bLng] = values;
    const R = 6371;
    const dLat = ((bLat - aLat) * Math.PI) / 180;
    const dLng = ((bLng - aLng) * Math.PI) / 180;
    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
};

const fmtDistance = (km) => {
    if (km == null) return "—";
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
};

const fmtCoord = (value, pos, neg) => {
    const n = Number(value);
    if (!Number.isFinite(n) || value === null || value === "") return "—";
    return `${Math.abs(n).toFixed(4)}° ${n >= 0 ? pos : neg}`;
};

const hasPoint = (lat, lng) =>
    lat !== null && lat !== undefined && lat !== "" && lng !== null && lng !== undefined && lng !== "";

const STATUS_TONE = { present: "blue", completed: "green", absent: "red", "on leave": "amber" };

// Punch helper — normalises check-in / check-out fields
const punchOf = (record, kind) => {
    const isIn = kind === "check-in";
    return {
        kind,
        label: isIn ? "Check In" : "Check Out",
        at: isIn ? record.check_in_at : record.check_out_at,
        photo: isIn ? record.check_in_photo : record.check_out_photo,
        lat: isIn ? record.check_in_latitude : record.check_out_latitude,
        lng: isIn ? record.check_in_longitude : record.check_out_longitude,
        accuracy: isIn ? record.check_in_accuracy : record.check_out_accuracy,
        remarks: isIn ? record.check_in_remarks : record.check_out_remarks,
    };
};

// Loads a protected attendance selfie as a blob URL
const usePhoto = (recordId, kind, enabled) => {
    const key = enabled && recordId ? `${recordId}:${kind}` : "";
    const [state, setState] = useState({ key: "", url: "", error: false });

    useEffect(() => {
        if (!key) return undefined;
        let alive = true;
        let created = "";
        getAttendancePhotoAccess(recordId, kind)
            .then((url) => {
                created = url;
                if (alive) setState({ key, url, error: false });
                else URL.revokeObjectURL(url);
            })
            .catch(() => alive && setState({ key, url: "", error: true }));
        return () => {
            alive = false;
            if (created) URL.revokeObjectURL(created);
        };
    }, [key, recordId, kind]);

    if (!key) return { url: "", loading: false, error: false };
    if (state.key !== key) return { url: "", loading: true, error: false };
    return { url: state.url, loading: false, error: state.error };
};

// Where the punch really happened (city from GPS)
function PunchWhere({ record, punch }) {
    const place = usePunchPlace(record, punch.kind);
    const label = place ? placeLabel(place) : "";
    const away = place ? storeMatchesPlace(record.store_name, record.store_city, place) === false : false;
    return (
        <>
            <b className={away ? "ad-away-text" : ""}>
                {away ? <FaExclamationTriangle /> : <FaMapMarkerAlt />} {label || record.store_name || "Location"}
            </b>
            <small>
                {hasPoint(punch.lat, punch.lng)
                    ? `${fmtCoord(punch.lat, "N", "S")}, ${fmtCoord(punch.lng, "E", "W")}`
                    : "Location not captured"}
            </small>
        </>
    );
}

// Banner when the punch city is not the store's city
function AwayBanner({ record, punch }) {
    const place = usePunchPlace(record, punch.kind);
    if (!place || !record.store_name) return null;
    if (storeMatchesPlace(record.store_name, record.store_city, place) !== false) return null;
    return (
        <section className="ad-away">
            <FaExclamationTriangle />
            <span>
                {punch.label} was made at <b>{placeLabel(place)}</b>, not at the store{" "}
                <b>{record.store_name}{record.store_city ? ` (${record.store_city})` : ""}</b>.
            </span>
        </section>
    );
}

function PunchPlaceText({ record, punch }) {
    const place = usePunchPlace(record, punch.kind);
    if (!hasPoint(punch.lat, punch.lng)) return "Not captured";
    if (place === undefined) return "Finding location…";
    return (place && (place.address || placeLabel(place))) || `${fmtCoord(punch.lat, "N", "S")}, ${fmtCoord(punch.lng, "E", "W")}`;
}

function PhotoThumb({ photo, big = false, onOpen }) {
    if (photo.loading) return <span className={`ad-photo ${big ? "is-big" : ""} is-loading`} />;
    if (!photo.url) {
        return (
            <span className={`ad-photo ${big ? "is-big" : ""} is-empty`}>
                <FaCamera />
                <small>{photo.error ? "Photo unavailable" : "No photo"}</small>
            </span>
        );
    }
    return (
        <button type="button" className={`ad-photo ${big ? "is-big" : ""}`} onClick={onOpen} aria-label="Open photo">
            <img src={photo.url} alt="Punch selfie" />
            {big && <span className="ad-photo-expand"><FaExpand /></span>}
        </button>
    );
}

function InfoRow({ icon, label, children }) {
    return (
        <div className="ad-info-row">
            <span className="ad-info-icon">{icon}</span>
            <span className="ad-info-label">{label}</span>
            <span className="ad-info-value">{children}</span>
        </div>
    );
}

export default function AttendanceDetailsSheet({ record, onClose }) {
    const [screen, setScreen] = useState({ name: "main", kind: null });
    const [lightbox, setLightbox] = useState("");
    const bodyRef = useRef(null);

    const checkIn = useMemo(() => punchOf(record, "check-in"), [record]);
    const checkOut = useMemo(() => punchOf(record, "check-out"), [record]);

    const inPhoto = usePhoto(record.id, "check-in", Boolean(record.check_in_photo));
    const outPhoto = usePhoto(record.id, "check-out", Boolean(record.check_out_photo));

    const photos = { "check-in": inPhoto, "check-out": outPhoto };

    const worked = minutesBetween(record.check_in_at, record.check_out_at);
    const distance = hasPoint(checkIn.lat, checkIn.lng) && hasPoint(checkOut.lat, checkOut.lng)
        ? distanceKm(checkIn.lat, checkIn.lng, checkOut.lat, checkOut.lng)
        : null;
    const punches = [checkIn, checkOut].filter((p) => p.at);
    const status = record.status || (record.check_out_at ? "Completed" : record.check_in_at ? "Present" : "Absent");
    const tone = STATUS_TONE[String(status).toLowerCase()] || "slate";

    const goBack = () => {
        if (screen.name === "location") setScreen({ name: "punch", kind: screen.kind });
        else setScreen({ name: "main", kind: null });
    };

    // Lock page scroll & support Escape / back
    useEffect(() => {
        const onKey = (event) => {
            if (event.key !== "Escape") return;
            if (lightbox) setLightbox("");
            else if (screen.name !== "main") goBack();
            else onClose?.();
        };
        document.addEventListener("keydown", onKey);
        document.body.classList.add("ad-sheet-open");
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.classList.remove("ad-sheet-open");
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screen, lightbox]);

    useEffect(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
    }, [screen]);

    const active = screen.kind === "check-out" ? checkOut : checkIn;
    const activePhoto = photos[active.kind];

    const title =
        screen.name === "main"
            ? "Attendance Details"
            : screen.name === "punch"
                ? `${active.label} Details`
                : "Location Details";

    const download = async (kind) => {
        try {
            await downloadAttendancePhoto(record.id, kind, `attendance-${record.id}-${kind}.jpg`);
        } catch {
            alert("Unable to download attendance photo.");
        }
    };

    return (
        <div className="ad-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
            <div className="ad-sheet" onClick={(e) => e.stopPropagation()}>

                {/* ============ APP HEADER ============ */}
                <header className="ad-header">
                    <button
                        type="button"
                        className="ad-back"
                        onClick={screen.name === "main" ? onClose : goBack}
                        aria-label={screen.name === "main" ? "Close" : "Back"}
                    >
                        <FaArrowLeft />
                    </button>
                    <h2>{title}</h2>
                </header>

                <div className="ad-body" ref={bodyRef}>

                    {/* ======================================
                        SCREEN 1 — ATTENDANCE DETAILS
                    ====================================== */}
                    {screen.name === "main" && (
                        <>
                            <section className="ad-card ad-profile">
                                <div className="ad-profile-top">
                                    <span className={`ad-avatar pp-avatar ${avatarTone(record.name)}`}>{initials(record.name)}</span>
                                    <div className="ad-profile-copy">
                                        <div className="ad-profile-name">
                                            <h3>{record.name || "Unknown"}</h3>
                                            <span className={`ad-status tone-${tone}`}><FaCheckCircle /> {status}</span>
                                        </div>
                                        <p>Employee ID : <b>{record.employee_id || "—"}</b></p>
                                        <p>Designation : <b>{record.designation || "—"}</b></p>
                                    </div>
                                </div>
                                <div className="ad-profile-grid">
                                    <div className="ad-mini">
                                        <span className="ad-mini-icon"><FaStore /></span>
                                        <span>
                                            <small>Store</small>
                                            <b>{record.store_name || "—"}{record.store_code ? ` (${record.store_code})` : ""}</b>
                                        </span>
                                    </div>
                                    <div className="ad-mini">
                                        <span className="ad-mini-icon"><FaBuilding /></span>
                                        <span>
                                            <small>Department</small>
                                            <b>{record.department || "—"}</b>
                                        </span>
                                    </div>
                                    {record.email && (
                                        <div className="ad-mini ad-mini--wide">
                                            <span className="ad-mini-icon"><FaUserTie /></span>
                                            <span>
                                                <small>Email</small>
                                                <b>{record.email}</b>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {checkIn.at && <AwayBanner record={record} punch={checkIn} />}
                            {checkOut.at && <AwayBanner record={record} punch={checkOut} />}

                            <section className="ad-card ad-date">
                                <span className="ad-date-icon"><FaCalendarAlt /></span>
                                <b>{fmtDate(record.work_date)}</b>
                            </section>

                            <section className="ad-stats">
                                <div className="ad-stat tone-green">
                                    <FaPowerOff />
                                    <b>{punches.length}</b>
                                    <small>Punches</small>
                                </div>
                                <div className="ad-stat tone-violet">
                                    <FaClock />
                                    <b>{worked == null ? "—" : fmtDuration(worked)}</b>
                                    <small>Total Hours</small>
                                </div>
                                <div className="ad-stat tone-blue">
                                    <FaSignInAlt />
                                    <b>{record.check_in_at ? 1 : 0}</b>
                                    <small>Check In</small>
                                </div>
                                <div className="ad-stat tone-red">
                                    <FaSignOutAlt />
                                    <b>{record.check_out_at ? 1 : 0}</b>
                                    <small>Check Out</small>
                                </div>
                            </section>

                            <section className="ad-card">
                                <h4 className="ad-section-title">Attendance Timeline</h4>

                                {punches.length === 0 ? (
                                    <div className="ad-empty">
                                        <FaTimesCircle />
                                        <span>No punches recorded for this day.</span>
                                    </div>
                                ) : (
                                    <ol className="ad-timeline">
                                        {[checkIn, checkOut].map((punch) => {
                                            if (!punch.at) {
                                                return punch.kind === "check-out" && checkIn.at ? (
                                                    <li key={punch.kind} className="ad-tl-item is-pending">
                                                        <span className="ad-tl-dot" />
                                                        <div className="ad-tl-head">
                                                            <b>—</b>
                                                            <span className="ad-tl-tag is-out">Not checked out</span>
                                                        </div>
                                                    </li>
                                                ) : null;
                                            }
                                            return (
                                                <li key={punch.kind} className={`ad-tl-item ${punch.kind === "check-in" ? "is-in" : "is-out"}`}>
                                                    <span className="ad-tl-dot" />
                                                    <div className="ad-tl-head">
                                                        <b>{fmtTime(punch.at)}</b>
                                                        <span className={`ad-tl-tag ${punch.kind === "check-in" ? "is-in" : "is-out"}`}>{punch.label}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="ad-tl-card"
                                                        onClick={() => setScreen({ name: "punch", kind: punch.kind })}
                                                    >
                                                        <PhotoThumb photo={photos[punch.kind]} />
                                                        <span className="ad-tl-where">
                                                            <PunchWhere record={record} punch={punch} />
                                                            {punch.remarks && <small className="ad-tl-remark">“{punch.remarks}”</small>}
                                                        </span>
                                                        <span className="ad-tl-go"><FaChevronRight /></span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                )}
                            </section>

                            <section className="ad-foot-stats">
                                <div>
                                    <FaHourglassHalf />
                                    <span><small>Work Hours</small><b>{fmtDuration(worked)}</b></span>
                                </div>
                                <div>
                                    <FaClock />
                                    <span><small>Work Date</small><b>{fmtDate(record.work_date).slice(0, 6)}</b></span>
                                </div>
                                <div>
                                    <FaRoute />
                                    <span><small>Distance</small><b>{fmtDistance(distance)}</b></span>
                                </div>
                            </section>
                        </>
                    )}

                    {/* ======================================
                        SCREEN 2 — CHECK IN / OUT DETAILS
                    ====================================== */}
                    {screen.name === "punch" && (
                        <>
                            <section className="ad-card ad-punch-head">
                                <span className={`ad-punch-badge ${active.kind === "check-in" ? "is-in" : "is-out"}`}>
                                    {active.kind === "check-in" ? <FaCheckCircle /> : <FaSignOutAlt />}
                                </span>
                                <b>{active.label}</b>
                                <span className="ad-punch-when">
                                    {fmtDate(active.at)}
                                    <small>{fmtTime(active.at)}</small>
                                </span>
                            </section>

                            <PhotoThumb photo={activePhoto} big onOpen={() => setLightbox(activePhoto.url)} />

                            <section className="ad-card ad-info">
                                <InfoRow icon={<FaUser />} label="Employee">
                                    {record.name || "—"} {record.employee_id ? `(ID: ${record.employee_id})` : ""}
                                </InfoRow>
                                <InfoRow icon={<FaStore />} label="Store">
                                    {record.store_name || "—"}{record.store_code ? ` (${record.store_code})` : ""}
                                </InfoRow>
                                <InfoRow icon={<FaGlobeAsia />} label="Punched At">
                                    <PunchPlaceText record={record} punch={active} />
                                </InfoRow>
                                <InfoRow icon={<FaClock />} label="Time">{fmtTime(active.at)}</InfoRow>
                                <InfoRow icon={<FaMapMarkerAlt />} label="Location">
                                    {hasPoint(active.lat, active.lng) ? (
                                        <button
                                            type="button"
                                            className="ad-chip-btn"
                                            onClick={() => setScreen({ name: "location", kind: active.kind })}
                                        >
                                            <FaMapMarkerAlt /> View on Map
                                        </button>
                                    ) : "Not captured"}
                                </InfoRow>
                                <InfoRow icon={<FaCrosshairs />} label="Accuracy">
                                    {active.accuracy ? `${Math.round(Number(active.accuracy))} meters` : "—"}
                                </InfoRow>
                                {active.remarks && (
                                    <InfoRow icon={<FaCommentDots />} label="Remarks">{active.remarks}</InfoRow>
                                )}
                            </section>

                            <div className="ad-actions">
                                {activePhoto.url && (
                                    <button type="button" className="ad-btn ad-btn-ghost" onClick={() => download(active.kind)}>
                                        <FaDownload /> Download
                                    </button>
                                )}
                                <button type="button" className="ad-btn ad-btn-outline" onClick={goBack}>Close</button>
                            </div>
                        </>
                    )}

                    {/* ======================================
                        SCREEN 3 — LOCATION DETAILS
                    ====================================== */}
                    {screen.name === "location" && (
                        <LocationScreen record={record} punch={active} onClose={goBack} />
                    )}
                </div>
            </div>

            {lightbox && (
                <div className="ad-lightbox" onClick={(e) => { e.stopPropagation(); setLightbox(""); }}>
                    <img src={lightbox} alt="Punch selfie full size" />
                </div>
            )}
        </div>
    );
}

function LocationScreen({ record, punch, onClose }) {
    const place = usePunchPlace(record, punch.kind);
    const address = place ? place.address || placeLabel(place) : "";
    const away = place ? storeMatchesPlace(record.store_name, record.store_city, place) === false : false;
    const lat = Number(punch.lat);
    const lng = Number(punch.lng);
    const mapSrc = `https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
    const openUrl = `https://www.google.com/maps?q=${lat},${lng}`;

    return (
        <>
            <section className="ad-map">
                <iframe title="Punch location" src={mapSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                <div className="ad-map-card">
                    <b>{place ? placeLabel(place) || "Punch location" : "Punch location"}</b>
                    <small>{address || `${fmtCoord(punch.lat, "N", "S")}, ${fmtCoord(punch.lng, "E", "W")}`}</small>
                </div>
                <a className="ad-map-open" href={openUrl} target="_blank" rel="noopener noreferrer" aria-label="Open in Google Maps">
                    <FaExpand />
                </a>
            </section>

            <section className="ad-card ad-info">
                <h4 className="ad-section-title">Location Information</h4>
                <InfoRow icon={<FaMapMarkerAlt />} label="Address">{address || "—"}</InfoRow>
                <InfoRow icon={<FaStore />} label="Store">
                    {record.store_name || "—"}{record.store_code ? ` (${record.store_code})` : ""}
                    {record.store_city ? ` · ${record.store_city}` : ""}
                    {away && <span className="ad-away-chip"><FaExclamationTriangle /> Different city</span>}
                </InfoRow>
                <InfoRow icon={<FaGlobeAsia />} label="Latitude">{fmtCoord(punch.lat, "N", "S")}</InfoRow>
                <InfoRow icon={<FaGlobeAsia />} label="Longitude">{fmtCoord(punch.lng, "E", "W")}</InfoRow>
                <InfoRow icon={<FaCrosshairs />} label="Accuracy">
                    {punch.accuracy ? `${Math.round(Number(punch.accuracy))} meters` : "—"}
                </InfoRow>
                <InfoRow icon={<FaClock />} label="Captured At">
                    {fmtDate(punch.at)}, {fmtTime(punch.at)}
                </InfoRow>
            </section>

            <div className="ad-actions">
                <a className="ad-btn ad-btn-ghost" href={openUrl} target="_blank" rel="noopener noreferrer">
                    <FaMapMarkerAlt /> Open in Maps
                </a>
                <button type="button" className="ad-btn ad-btn-primary" onClick={onClose}>Close</button>
            </div>
        </>
    );
}
