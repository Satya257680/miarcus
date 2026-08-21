import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FaCamera,
    FaCheckCircle,
    FaClock,
    FaCrosshairs,
    FaMapMarkerAlt,
    FaShieldAlt,
    FaStore,
    FaSyncAlt,
    FaTimes,
    FaUserCircle,
} from "react-icons/fa";

import {
    checkIn,
    checkOut,
    getAttendanceContext,
} from "../services/attendanceService";

import "../styles/pages/Attendance.css";

const today = () =>
    new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
    });

const fmtTime = (value) =>
    value
        ? new Date(value).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
          })
        : "—";

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

    const attendance = context?.attendance;
    const checkedIn = Boolean(attendance?.check_in_at);
    const completed = Boolean(attendance?.check_out_at);

    const elapsed = useMemo(() => {
        if (!attendance?.check_in_at) {
            return "00h 00m";
        }

        const end = attendance.check_out_at
            ? new Date(attendance.check_out_at)
            : now;

        const ms = Math.max(
            0,
            end - new Date(attendance.check_in_at)
        );

        const mins = Math.floor(ms / 60000);

        return `${String(Math.floor(mins / 60)).padStart(
            2,
            "0"
        )}h ${String(mins % 60).padStart(2, "0")}m`;
    }, [attendance, now]);

    const load = useCallback(async () => {
        try {
            setError("");

            const data = await getAttendanceContext(date);

            setContext(data);

            if (!selectedStore && data.stores?.length) {
                setSelectedStore(String(data.stores[0].id));
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to load your attendance workspace."
            );
        }
    }, [date, selectedStore]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        return () => stopCamera();
    }, []);

    function stopCamera() {
        streamRef.current?.getTracks().forEach((track) => {
            track.stop();
        });

        streamRef.current = null;

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }

    async function enableCamera() {
        try {
            setError("");
            setCameraState("loading");

            const stream =
                await navigator.mediaDevices.getUserMedia({
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
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => {});
                }
            });
        } catch (err) {
            setCameraState("error");

            setError(
                err.name === "NotAllowedError"
                    ? "Camera permission was denied. Allow camera access and try again."
                    : "Unable to start the camera."
            );
        }
    }

    function capturePhoto() {
        if (!videoRef.current || !canvasRef.current) {
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;

        canvas
            .getContext("2d")
            .drawImage(
                video,
                0,
                0,
                canvas.width,
                canvas.height
            );

        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    return;
                }

                const file = new File(
                    [blob],
                    `attendance-${Date.now()}.jpg`,
                    {
                        type: "image/jpeg",
                    }
                );

                setPhoto(file);
                setPhotoPreview(URL.createObjectURL(blob));

                stopCamera();
                setCameraState("captured");
            },
            "image/jpeg",
            0.88
        );
    }

    function retake() {
        setPhoto(null);

        if (photoPreview) {
            URL.revokeObjectURL(photoPreview);
        }

        setPhotoPreview("");
        enableCamera();
    }

    function getLocation() {
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
    }

    async function submit(mode) {
        if (!selectedStore) {
            setError("Please select your assigned store.");
            return;
        }

        if (!location) {
            setError("Please verify your location first.");
            return;
        }

        if (mode === "check-in" && !photo) {
            setError("Please capture your attendance photo.");
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
            formData.append(
                "accuracy",
                location.accuracy || ""
            );
            formData.append("remarks", remarks);

            if (photo) {
                formData.append("photo", photo);
            }

            const data =
                mode === "check-in"
                    ? await checkIn(formData)
                    : await checkOut(formData);

            setMessage(
                data.message ||
                    "Attendance updated successfully."
            );

            setRemarks("");

            await load();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    "Unable to update attendance."
            );
        } finally {
            setBusy(false);
        }
    }

    const user = context?.user;

    const selectedStoreData = context?.stores?.find(
        (store) =>
            String(store.id) === String(selectedStore)
    );

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
                            Secure employee check-in with live GPS
                            verification and photo evidence.
                        </p>
                    </div>

                    <div className="attendance-date-card">
                        <span>{fmtDate(date)}</span>

                        <strong>
                            {now.toLocaleTimeString([], {
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

                        <strong>
                            {fmtTime(attendance?.check_in_at)}
                        </strong>

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
                                <span className="card-kicker">
                                    Employee
                                </span>

                                <h2>Your work profile</h2>
                            </div>

                            <FaUserCircle />
                        </div>

                        <div className="profile-row">
                            <div className="profile-avatar">
                                <FaUserCircle />
                            </div>

                            <div>
                                <strong>
                                    {user?.name || "Employee"}
                                </strong>

                                <span>
                                    {user?.employee_id || "—"} ·{" "}
                                    {user?.designation ||
                                        "Team member"}
                                </span>
                            </div>
                        </div>

                        <div className="profile-meta">
                            <div>
                                <span>Department</span>
                                <strong>
                                    {user?.department || "—"}
                                </strong>
                            </div>

                            <div>
                                <span>Assigned store</span>
                                <strong>
                                    {selectedStoreData?.store_name ||
                                        "Select below"}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className="attendance-card location-card">
                        <div className="card-heading">
                            <div>
                                <span className="card-kicker">
                                    Step 01
                                </span>

                                <h2>Location verification</h2>
                            </div>

                            <FaMapMarkerAlt />
                        </div>

                        <div
                            className={`verification ${locationState}`}
                        >
                            <div className="verification-icon">
                                <FaMapMarkerAlt />
                            </div>

                            <div>
                                <strong>{locationLabel}</strong>

                                <span>
                                    {location
                                        ? `${location.latitude.toFixed(
                                              5
                                          )}, ${location.longitude.toFixed(
                                              5
                                          )}`
                                        : "Your browser GPS is used only when you request it."}
                                </span>
                            </div>
                        </div>

                        <div className="location-actions">
                            <button
                                className="attendance-btn secondary"
                                onClick={getLocation}
                                disabled={
                                    locationState === "loading"
                                }
                            >
                                <FaCrosshairs />

                                {locationState === "loading"
                                    ? "Detecting…"
                                    : "Get my location"}
                            </button>

                            {location?.accuracy && (
                                <span>
                                    ±
                                    {Math.round(
                                        location.accuracy
                                    )}{" "}
                                    m accuracy
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
                                Capture a clear photo and submit the
                                attendance event with the selected
                                store and GPS coordinates.
                            </p>
                        </div>

                        <div className="live-chip">
                            <i />

                            {cameraState === "ready"
                                ? "Camera ready"
                                : cameraState === "captured"
                                  ? "Photo captured"
                                  : "Camera off"}
                        </div>
                    </div>

                    <div className="action-layout">
                        <div className="camera-panel">
                            <div className="camera-label">
                                <span>Camera evidence</span>

                                <small>
                                    {photo
                                        ? "Preview ready"
                                        : "No photo captured"}
                                </small>
                            </div>

                            <div className="camera-frame">
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Attendance capture"
                                    />
                                ) : cameraState === "ready" ? (
                                    <video
                                        ref={videoRef}
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <div className="camera-placeholder">
                                        <FaCamera />

                                        <strong>
                                            Camera not active
                                        </strong>

                                        <span>
                                            Camera permission is
                                            requested only when
                                            you enable it.
                                        </span>
                                    </div>
                                )}

                                <canvas
                                    ref={canvasRef}
                                    hidden
                                />
                            </div>

                            <div className="camera-actions">
                                {photoPreview ? (
                                    <button
                                        className="attendance-btn secondary"
                                        onClick={retake}
                                    >
                                        <FaSyncAlt />
                                        Retake
                                    </button>
                                ) : cameraState === "ready" ? (
                                    <button
                                        className="attendance-btn primary"
                                        onClick={capturePhoto}
                                    >
                                        <FaCamera />
                                        Capture photo
                                    </button>
                                ) : (
                                    <button
                                        className="attendance-btn secondary"
                                        onClick={enableCamera}
                                    >
                                        <FaCamera />
                                        Enable camera
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="action-form">
                            <label>
                                Assigned store

                                <select
                                    value={selectedStore}
                                    onChange={(event) =>
                                        setSelectedStore(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        checkedIn || completed
                                    }
                                >
                                    <option value="">
                                        Select assigned store
                                    </option>

                                    {context?.stores?.map(
                                        (store) => (
                                            <option
                                                key={store.id}
                                                value={store.id}
                                            >
                                                {store.store_name}{" "}
                                                (
                                                {store.store_code}
                                                )
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>

                            <div className="readiness-list">
                                <div
                                    className={
                                        location ? "ready" : ""
                                    }
                                >
                                    <FaMapMarkerAlt />

                                    <span>
                                        <strong>
                                            GPS location
                                        </strong>

                                        <small>
                                            {location
                                                ? "Captured and ready"
                                                : "Required before check-in"}
                                        </small>
                                    </span>

                                    <FaCheckCircle />
                                </div>

                                <div
                                    className={
                                        photo ? "ready" : ""
                                    }
                                >
                                    <FaCamera />

                                    <span>
                                        <strong>
                                            Photo evidence
                                        </strong>

                                        <small>
                                            {photo
                                                ? "Captured and ready"
                                                : "Required before check-in"}
                                        </small>
                                    </span>

                                    <FaCheckCircle />
                                </div>

                                <div className="ready">
                                    <FaStore />

                                    <span>
                                        <strong>
                                            Store assignment
                                        </strong>

                                        <small>
                                            {selectedStoreData
                                                ? selectedStoreData.store_name
                                                : "Select your assigned store"}
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
                                        setRemarks(
                                            event.target.value
                                        )
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
                            <span className="card-kicker">
                                Today's activity
                            </span>

                            <h2>Attendance timeline</h2>
                        </div>

                        <FaClock />
                    </div>

                    <div className="timeline">
                        <div className="timeline-item">
                            <i
                                className={
                                    checkedIn ? "done" : ""
                                }
                            />

                            <div>
                                <strong>Check-in</strong>

                                <span>
                                    {attendance?.check_in_at
                                        ? `${fmtTime(
                                              attendance.check_in_at
                                          )} · ${
                                              attendance.store_name ||
                                              "Store"
                                          }`
                                        : "Waiting for check-in"}
                                </span>
                            </div>
                        </div>

                        <div className="timeline-line" />

                        <div className="timeline-item">
                            <i
                                className={
                                    completed ? "done" : ""
                                }
                            />

                            <div>
                                <strong>Check-out</strong>

                                <span>
                                    {attendance?.check_out_at
                                        ? fmtTime(
                                              attendance.check_out_at
                                          )
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
