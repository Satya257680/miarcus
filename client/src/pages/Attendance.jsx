import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FaCamera,
    FaCheckCircle,
    FaClock,
    FaCrosshairs,
    FaMapMarkerAlt,
    FaShieldAlt,
    FaStore,
    FaTimes,
    FaUserCircle,
} from "react-icons/fa";

import {
    checkIn,
    checkOut,
    getAttendanceContext,
} from "../services/attendanceService";

import "../styles/pages/Attendance.css";

const INDIA_TIME_ZONE = "Asia/Kolkata";

const today = () =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: INDIA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

const parseAttendanceDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;

    const text = String(value);

    // MySQL DATETIME values are stored as India Standard Time by the
    // attendance controller. Explicitly attach +05:30 so the browser
    // never interprets them using the device/server timezone.
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(text)) {
        const base = text.slice(0, 19).replace(" ", "T");
        return new Date(`${base}+05:30`);
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const fmtTime = (value) => {
    const date = parseAttendanceDate(value);
    return date
        ? date.toLocaleTimeString([], {
              timeZone: INDIA_TIME_ZONE,
              hour: "2-digit",
              minute: "2-digit",
          })
        : "—";
};

const fmtDate = (value) =>
    new Date(`${value}T00:00:00`).toLocaleDateString([], {
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

export default function Attendance() {
    const [date] = useState(today());
    const [context, setContext] = useState(null);
    const [selectedStore, setSelectedStore] = useState("");
    const [location, setLocation] = useState(null);
    const [locationState, setLocationState] = useState("idle");
    const [cameraState, setCameraState] = useState("idle");
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState("");
    const [remarks, setRemarks] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [now, setNow] = useState(new Date());

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const canvasRef = useRef(null);
    const autoCaptureTimerRef = useRef(null);
    const autoCaptureStartedRef = useRef(false);

    const attendance = context?.attendance;
    const checkedIn = Boolean(attendance?.check_in_at);
    const completed = Boolean(attendance?.check_out_at);
    const assignedStore = context?.assignedStore || null;

    const elapsed = useMemo(() => {
        if (!attendance?.check_in_at) return "00h 00m";

        const end = attendance.check_out_at
            ? parseAttendanceDate(attendance.check_out_at)
            : now;
        const start = parseAttendanceDate(attendance.check_in_at);
        if (!start || !end) return "00h 00m";

        const milliseconds = Math.max(0, end - start);
        const minutes = Math.floor(milliseconds / 60000);

        return `${String(Math.floor(minutes / 60)).padStart(2, "0")}h ${String(
            minutes % 60
        ).padStart(2, "0")}m`;
    }, [attendance, now]);

    const load = useCallback(async () => {
        try {
            setError("");
            const data = await getAttendanceContext(date);
            setContext(data);

            if (data.assignedStore?.id) {
                setSelectedStore(String(data.assignedStore.id));
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to load your attendance workspace."
            );
        }
    }, [date]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        return () => {
            if (autoCaptureTimerRef.current) {
                clearTimeout(autoCaptureTimerRef.current);
            }

            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (photoPreview) URL.revokeObjectURL(photoPreview);
        };
    }, [photoPreview]);

    const stopCamera = useCallback(() => {
        if (autoCaptureTimerRef.current) {
            clearTimeout(autoCaptureTimerRef.current);
            autoCaptureTimerRef.current = null;
        }

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;

        if (!width || !height) return;

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, width, height);

        canvas.toBlob(
            (blob) => {
                if (!blob) return;

                const file = new File(
                    [blob],
                    `attendance-${Date.now()}.jpg`,
                    { type: "image/jpeg" }
                );

                setPhoto(file);
                setPhotoPreview(URL.createObjectURL(blob));
                setCameraState("captured");
                stopCamera();
            },
            "image/jpeg",
            0.88
        );
    }, [stopCamera]);

    const enableCamera = useCallback(async () => {
        if (completed || photo || autoCaptureStartedRef.current) {
            return;
        }

        try {
            setError("");
            setCameraState("loading");
            autoCaptureStartedRef.current = true;

            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Camera API is unavailable in this browser.");
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });

            streamRef.current = stream;
            setCameraState("ready");

            requestAnimationFrame(() => {
                const video = videoRef.current;
                if (!video) return;

                video.srcObject = stream;
                video.muted = true;
                video.playsInline = true;
                video.play().catch(() => {});

                autoCaptureTimerRef.current = setTimeout(() => {
                    capturePhoto();
                }, 1800);
            });
        } catch (err) {
            autoCaptureStartedRef.current = false;
            stopCamera();
            setCameraState("error");
            setError(
                err.name === "NotAllowedError"
                    ? "Camera permission was denied. Allow camera access and reload the attendance page."
                    : err.message || "Unable to start the camera."
            );
        }
    }, [capturePhoto, checkedIn, completed, photo, stopCamera]);

    useEffect(() => {
        if (!context || completed || photo) return;
        enableCamera();
    }, [context, checkedIn, completed, photo, enableCamera]);

    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setError("Your browser does not support GPS location.");
            return;
        }

        setLocationState("loading");
        setError("");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
                setLocationState("ready");
            },
            (err) => {
                setLocationState("error");
                setError(
                    err.code === 1
                        ? "Location permission was denied. Allow location access and try again."
                        : "Unable to detect your location."
                );
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
            }
        );
    }, []);

    useEffect(() => {
        if (!context) return;

        // Restore the last verified attendance coordinates immediately
        // after a refresh so the UI does not incorrectly show "Pending".
        const storedAttendance = context.attendance;
        const storedLatitude = storedAttendance?.check_out_latitude ??
            storedAttendance?.check_in_latitude;
        const storedLongitude = storedAttendance?.check_out_longitude ??
            storedAttendance?.check_in_longitude;
        const storedAccuracy = storedAttendance?.check_out_accuracy ??
            storedAttendance?.check_in_accuracy;

        if (
            Number.isFinite(Number(storedLatitude)) &&
            Number.isFinite(Number(storedLongitude))
        ) {
            setLocation({
                latitude: Number(storedLatitude),
                longitude: Number(storedLongitude),
                accuracy: Number(storedAccuracy || 0),
            });
            setLocationState("ready");
        }

        // A live GPS reading is required before a new check-in or checkout.
        // If an attendance session is already open, refresh GPS for checkout.
        if (!storedAttendance?.check_out_at) {
            getLocation();
        }
    }, [context, getLocation]);

    const submit = async (mode) => {
        if (!selectedStore) {
            setError("No assigned store is available for this account.");
            return;
        }

        if (!location) {
            setError("Please verify your location first.");
            return;
        }

        if (!photo) {
            setError("Automatic photo capture has not completed yet.");
            return;
        }

        try {
            setBusy(true);
            setError("");
            setMessage("");

            const formData = new FormData();
            formData.append("workDate", date);
            formData.append("storeId", selectedStore);
            formData.append("latitude", location.latitude);
            formData.append("longitude", location.longitude);
            formData.append("accuracy", location.accuracy || "");
            formData.append("remarks", remarks);

            if (photo) formData.append("photo", photo);

            const data =
                mode === "check-in"
                    ? await checkIn(formData)
                    : await checkOut(formData);

            setMessage(
                data.message || "Attendance updated successfully."
            );
            setRemarks("");

            if (mode === "check-in") {
                if (photoPreview) {
                    URL.revokeObjectURL(photoPreview);
                }
                setPhoto(null);
                setPhotoPreview("");
                setCameraState("idle");
                autoCaptureStartedRef.current = false;
            }

            await load();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to update attendance."
            );
        } finally {
            setBusy(false);
        }
    };

    const user = context?.user;
    const selectedStoreData = assignedStore;

    const locationLabel =
        locationState === "ready"
            ? "Location captured"
            : locationState === "loading"
              ? "Detecting location…"
              : "Location not verified";

    return (
        <div className="attendance-page">
            <div className="attendance-shell">
                <header className="attendance-hero">
                    <div>
                        <div className="attendance-eyebrow">
                            <FaShieldAlt />
                            Workforce attendance
                        </div>
                        <h1>Attendance</h1>
                        <p>
                            Secure employee check-in with live GPS verification
                            and automatic photo evidence.
                        </p>
                    </div>

                    <div className="attendance-date-card">
                        <span>{fmtDate(date)}</span>
                        <strong>
                            {now.toLocaleTimeString([], {
                                timeZone: INDIA_TIME_ZONE,
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            })}
                        </strong>
                        <small>India Standard Time</small>
                    </div>
                </header>

                {error && (
                    <div className="attendance-alert error">
                        <FaTimes />
                        {error}
                    </div>
                )}

                {message && (
                    <div className="attendance-alert success">
                        <FaCheckCircle />
                        {message}
                    </div>
                )}

                <section className="attendance-kpis">
                    <div className="attendance-kpi">
                        <span>Work status</span>
                        <strong
                            className={
                                completed
                                    ? "done"
                                    : checkedIn
                                      ? "active"
                                      : "ready"
                            }
                        >
                            {completed
                                ? "Completed"
                                : checkedIn
                                  ? "Checked in"
                                  : "Ready"}
                        </strong>
                        <small>
                            {completed
                                ? "Today's attendance closed"
                                : checkedIn
                                  ? "Attendance session is active"
                                  : "Ready for secure check-in"}
                        </small>
                    </div>

                    <div className="attendance-kpi">
                        <span>Check-in</span>
                        <strong>{fmtTime(attendance?.check_in_at)}</strong>
                        <small>
                            {attendance?.check_in_at
                                ? "Recorded today"
                                : "Not recorded yet"}
                        </small>
                    </div>

                    <div className="attendance-kpi">
                        <span>Location</span>
                        <strong
                            className={
                                locationState === "ready"
                                    ? "active"
                                    : "ready"
                            }
                        >
                            {locationState === "ready"
                                ? "Verified"
                                : "Pending"}
                        </strong>
                        <small>
                            {location?.accuracy
                                ? `Accuracy ±${Math.round(
                                      location.accuracy
                                  )} m`
                                : "GPS verification required"}
                        </small>
                    </div>

                    <div className="attendance-kpi">
                        <span>Today's hours</span>
                        <strong>{elapsed}</strong>
                        <small>
                            {completed
                                ? "Final working duration"
                                : "Live session duration"}
                        </small>
                    </div>
                </section>

                <section className="attendance-grid-top">
                    <div className="attendance-card profile-card">
                        <div className="card-heading">
                            <div>
                                <span className="card-kicker">Employee</span>
                                <h2>Your work profile</h2>
                            </div>
                            <FaUserCircle />
                        </div>

                        <div className="profile-row">
                            <div className="profile-avatar">
                                <FaUserCircle />
                            </div>
                            <div>
                                <strong>{user?.name || "Employee"}</strong>
                                <span>
                                    {user?.employee_id || "—"} · {user?.designation || "Team member"}
                                </span>
                            </div>
                        </div>

                        <div className="profile-meta">
                            <div>
                                <span>Department</span>
                                <strong>{user?.department || "—"}</strong>
                            </div>
                            <div>
                                <span>Assigned store</span>
                                <strong>
                                    {selectedStoreData?.store_name ||
                                        "No store assigned"}
                                </strong>
                                <small>
                                    {selectedStoreData?.store_code || ""}
                                </small>
                            </div>
                        </div>
                    </div>

                    <div className="attendance-card location-card">
                        <div className="card-heading">
                            <div>
                                <span className="card-kicker">Step 01</span>
                                <h2>Location verification</h2>
                            </div>
                            <FaMapMarkerAlt />
                        </div>

                        <div className={`verification ${locationState}`}>
                            <div className="verification-icon">
                                <FaMapMarkerAlt />
                            </div>
                            <div>
                                <strong>{locationLabel}</strong>
                                <span>
                                    {location
                                        ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                                        : "Your browser GPS is used only when you request it."}
                                </span>
                            </div>
                        </div>

                        <div className="location-actions">
                            <button
                                className="attendance-btn secondary"
                                onClick={getLocation}
                                disabled={locationState === "loading"}
                            >
                                <FaCrosshairs />
                                {locationState === "loading"
                                    ? "Detecting…"
                                    : "Get my location"}
                            </button>

                            {location?.accuracy && (
                                <span>
                                    ±{Math.round(location.accuracy)} m accuracy
                                </span>
                            )}
                        </div>
                    </div>
                </section>

                <section className="attendance-card action-card">
                    <div className="card-heading action-heading">
                        <div>
                            <span className="card-kicker">
                                Step 02 · Secure evidence
                            </span>
                            <h2>
                                {completed
                                    ? "Attendance completed"
                                    : checkedIn
                                      ? "Check-out workspace"
                                      : "Check-in workspace"}
                            </h2>
                            <p>
                                Your camera captures the attendance photo
                                automatically. No manual capture is required.
                            </p>
                        </div>

                        <div className="live-chip">
                            <i />
                            {cameraState === "ready"
                                ? "Capturing automatically"
                                : cameraState === "captured"
                                  ? "Photo captured"
                                  : cameraState === "loading"
                                    ? "Starting camera"
                                    : "Camera off"}
                        </div>
                    </div>

                    <div className="action-layout">
                        <div className="camera-panel">
                            <div className="camera-label">
                                <span>Camera evidence</span>
                                <small>
                                    {photo
                                        ? "Automatic capture complete"
                                        : cameraState === "loading" ||
                                            cameraState === "ready"
                                          ? "Automatic capture in progress"
                                          : "Waiting for camera"}
                                </small>
                            </div>

                            <div className="camera-frame">
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Automatic attendance capture"
                                    />
                                ) : cameraState === "ready" ? (
                                    <video
                                        ref={videoRef}
                                        muted
                                        playsInline
                                        autoPlay
                                    />
                                ) : (
                                    <div className="camera-placeholder">
                                        <FaCamera />
                                        <strong>
                                            {cameraState === "loading"
                                                ? "Starting camera…"
                                                : "Camera not active"}
                                        </strong>
                                        <span>
                                            {cameraState === "error"
                                                ? "Allow camera access and reload this page to capture attendance automatically."
                                                : "The attendance camera starts automatically for check-in and check-out."}
                                        </span>
                                    </div>
                                )}
                                <canvas ref={canvasRef} hidden />
                            </div>
                        </div>

                        <div className="action-form">
                            <div className="assigned-store-lock">
                                <div>
                                    <span>Assigned store</span>
                                    <strong>
                                        {selectedStoreData?.store_name ||
                                            "No store assigned"}
                                    </strong>
                                    <small>
                                        {selectedStoreData?.store_code
                                            ? `Store ${selectedStoreData.store_code}`
                                            : "Attendance store is controlled by your user assignment"}
                                    </small>
                                </div>
                                <FaStore />
                            </div>

                            <div className="readiness-list">
                                <div className={location ? "ready" : ""}>
                                    <FaMapMarkerAlt />
                                    <span>
                                        <strong>GPS location</strong>
                                        <small>
                                            {location
                                                ? "Captured and ready"
                                                : "Required before check-in"}
                                        </small>
                                    </span>
                                    <FaCheckCircle />
                                </div>

                                <div className={photo ? "ready" : ""}>
                                    <FaCamera />
                                    <span>
                                        <strong>Photo evidence</strong>
                                        <small>
                                            {photo
                                                ? "Captured automatically and ready"
                                                : "Automatic capture required"}
                                        </small>
                                    </span>
                                    <FaCheckCircle />
                                </div>

                                <div className={selectedStoreData ? "ready" : ""}>
                                    <FaStore />
                                    <span>
                                        <strong>Store assignment</strong>
                                        <small>
                                            {selectedStoreData
                                                ? selectedStoreData.store_name
                                                : "No store assigned"}
                                        </small>
                                    </span>
                                    <FaCheckCircle />
                                </div>
                            </div>

                            <label>
                                Remarks / comments
                                <textarea
                                    value={remarks}
                                    onChange={(event) =>
                                        setRemarks(event.target.value)
                                    }
                                    placeholder="Add an optional attendance note…"
                                />
                            </label>

                            {!completed && (
                                <button
                                    className="attendance-submit"
                                    disabled={
                                        busy ||
                                        !location ||
                                        (!checkedIn && !photo) ||
                                        !selectedStore
                                    }
                                    onClick={() =>
                                        submit(
                                            checkedIn
                                                ? "check-out"
                                                : "check-in"
                                        )
                                    }
                                >
                                    <FaCheckCircle />
                                    {busy
                                        ? "Processing…"
                                        : checkedIn
                                          ? "Check out"
                                          : "Check in"}
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="attendance-card timeline-card">
                    <div className="card-heading">
                        <div>
                            <span className="card-kicker">Today's activity</span>
                            <h2>Attendance timeline</h2>
                        </div>
                        <FaClock />
                    </div>

                    <div className="timeline">
                        <div className="timeline-item">
                            <i className={checkedIn ? "done" : ""} />
                            <div>
                                <strong>Check-in</strong>
                                <span>
                                    {attendance?.check_in_at
                                        ? `${fmtTime(attendance.check_in_at)} · ${attendance.store_name || "Store"}`
                                        : "Waiting for check-in"}
                                </span>
                            </div>
                        </div>

                        <div className="timeline-line" />

                        <div className="timeline-item">
                            <i className={completed ? "done" : ""} />
                            <div>
                                <strong>Check-out</strong>
                                <span>
                                    {attendance?.check_out_at
                                        ? fmtTime(attendance.check_out_at)
                                        : checkedIn
                                          ? "Session in progress"
                                          : "Available after check-in"}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
