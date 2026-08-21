import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

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

// ======================================================
// CONSTANTS
// ======================================================

const INDIA_TIME_ZONE = "Asia/Kolkata";

const CAMERA_DELAY = 1200;

const LOCATION_TIMEOUT = 20000;

const LOCATION_MAX_AGE = 0;

// ======================================================
// INDIA DATE
// ======================================================

const today = () =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: INDIA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());

// ======================================================
// INDIA DATE/TIME PARSER
// ======================================================
//
// MySQL DATETIME:
//
//     2026-08-21 10:43:22
//
// is NOT timezone-aware.
//
// We explicitly treat it as:
//
//     2026-08-21T10:43:22+05:30
//
// This prevents browser timezone conversion.
// ======================================================

const parseAttendanceDate = (value) => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
            ? null
            : value;
    }

    const text = String(value).trim();

    if (!text) {
        return null;
    }

    // --------------------------------------------------
    // MySQL DATETIME
    // --------------------------------------------------

    const mysqlMatch = text.match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?$/
    );

    if (mysqlMatch) {
        const [
            ,
            year,
            month,
            day,
            hour,
            minute,
            second,
        ] = mysqlMatch;

        const parsed = new Date(
            `${year}-${month}-${day}T${hour}:${minute}:${second}+05:30`
        );

        return Number.isNaN(parsed.getTime())
            ? null
            : parsed;
    }

    // --------------------------------------------------
    // Explicit timezone timestamp
    // --------------------------------------------------

    const parsed = new Date(text);

    return Number.isNaN(parsed.getTime())
        ? null
        : parsed;
};

// ======================================================
// FORMAT INDIA TIME
// ======================================================

const fmtTime = (value) => {
    const date = parseAttendanceDate(value);

    if (!date) {
        return "—";
    }

    return new Intl.DateTimeFormat("en-IN", {
        timeZone: INDIA_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }).format(date);
};

// ======================================================
// FORMAT INDIA DATE
// ======================================================

const fmtDate = (value) => {
    if (!value) {
        return "—";
    }

    const parsed = new Date(
        `${value}T00:00:00+05:30`
    );

    if (Number.isNaN(parsed.getTime())) {
        return "—";
    }

    return new Intl.DateTimeFormat("en-IN", {
        timeZone: INDIA_TIME_ZONE,
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(parsed);
};

// ======================================================
// FORMAT LIVE CLOCK
// ======================================================

const fmtLiveTime = (value) =>
    new Intl.DateTimeFormat("en-IN", {
        timeZone: INDIA_TIME_ZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    }).format(value);

// ======================================================
// ATTENDANCE COMPONENT
// ======================================================

export default function Attendance() {
    // ==================================================
    // STATE
    // ==================================================

    const [date] = useState(today());

    const [context, setContext] =
        useState(null);

    const [selectedStore, setSelectedStore] =
        useState("");

    const [location, setLocation] =
        useState(null);

    const [locationCapturedAt, setLocationCapturedAt] =
        useState(null);

    const [locationState, setLocationState] =
        useState("idle");

    const [cameraState, setCameraState] =
        useState("idle");

    const [photo, setPhoto] =
        useState(null);

    const [photoPreview, setPhotoPreview] =
        useState("");

    const [remarks, setRemarks] =
        useState("");

    const [busy, setBusy] =
        useState(false);

    const [error, setError] =
        useState("");

    const [message, setMessage] =
        useState("");

    const [now, setNow] =
        useState(new Date());

    // After a completed session, immediately return the
    // employee workspace to the initial check-in state.
    // The completed record is still kept in the database
    // and therefore remains visible in Attendance Reports.
    const [readyForNewSession, setReadyForNewSession] =
        useState(false);

    // ==================================================
    // REFS
    // ==================================================

    const videoRef =
        useRef(null);

    const streamRef =
        useRef(null);

    const canvasRef =
        useRef(null);

    const autoCaptureTimerRef =
        useRef(null);

    const autoCaptureStartedRef =
        useRef(false);

    const locationWatchRef =
        useRef(null);

    // ==================================================
    // ATTENDANCE DATA
    // ==================================================

    const attendance =
        context?.attendance;

    const checkedIn =
        Boolean(
            attendance?.check_in_at
        ) && !readyForNewSession;

    const completed =
        Boolean(
            attendance?.check_out_at
        ) && !readyForNewSession;

    const assignedStore =
        context?.assignedStore || null;

    const user =
        context?.user;

    // ==================================================
    // LIVE WORKING DURATION
    // ==================================================

    const elapsed = useMemo(() => {
        if (!attendance?.check_in_at) {
            return "00h 00m";
        }

        const start =
            parseAttendanceDate(
                attendance.check_in_at
            );

        if (!start) {
            return "00h 00m";
        }

        const end =
            attendance?.check_out_at
                ? parseAttendanceDate(
                      attendance.check_out_at
                  )
                : now;

        if (!end) {
            return "00h 00m";
        }

        const milliseconds =
            Math.max(
                0,
                end.getTime() -
                    start.getTime()
            );

        const minutes =
            Math.floor(
                milliseconds / 60000
            );

        return `${String(
            Math.floor(minutes / 60)
        ).padStart(2, "0")}h ${String(
            minutes % 60
        ).padStart(2, "0")}m`;
    }, [attendance, now]);

    // ==================================================
    // LOAD ATTENDANCE CONTEXT
    // ==================================================

    const load = useCallback(
        async () => {
            try {
                setError("");

                const data =
                    await getAttendanceContext(
                        date
                    );

                setContext(data);

                // ------------------------------------------------
                // Store is NEVER selected by employee.
                // It comes from backend assignment.
                // ------------------------------------------------

                if (
                    data.assignedStore?.id
                ) {
                    setSelectedStore(
                        String(
                            data.assignedStore.id
                        )
                    );
                } else {
                    setSelectedStore("");
                }

                // ------------------------------------------------
                // Never reuse an old GPS position for a new
                // check-in/check-out. A saved position is only
                // useful for displaying a completed record.
                // Active attendance always requires a fresh GPS
                // capture from the browser.
                // ------------------------------------------------

                const saved = data.attendance;

                if (saved?.check_out_at) {
                    const latitude =
                        saved.check_out_latitude ??
                        saved.check_in_latitude;
                    const longitude =
                        saved.check_out_longitude ??
                        saved.check_in_longitude;
                    const accuracy =
                        saved.check_out_accuracy ??
                        saved.check_in_accuracy;

                    if (
                        Number.isFinite(Number(latitude)) &&
                        Number.isFinite(Number(longitude))
                    ) {
                        setLocation({
                            latitude: Number(latitude),
                            longitude: Number(longitude),
                            accuracy: Number(accuracy || 0),
                        });
                        setLocationCapturedAt(null);
                        setLocationState("ready");
                    }
                } else {
                    setLocation(null);
                    setLocationCapturedAt(null);
                    setLocationState("idle");
                }
            } catch (err) {
                setError(
                    err.response?.data
                        ?.message ||
                        "Unable to load your attendance workspace."
                );
            }
        },
        [date]
    );

    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(() => {
        load();
    }, [load]);

    // ==================================================
    // LIVE CLOCK
    // ==================================================

    useEffect(() => {
        const timer =
            setInterval(() => {
                setNow(new Date());
            }, 1000);

        return () =>
            clearInterval(timer);
    }, []);

    // ==================================================
    // STOP LOCATION WATCH
    // ==================================================

    const stopLocationWatch =
        useCallback(() => {
            if (
                locationWatchRef.current !== null
            ) {
                navigator.geolocation?.clearWatch(
                    locationWatchRef.current
                );

                locationWatchRef.current =
                    null;
            }
        }, []);

    // ==================================================
    // STOP CAMERA
    // ==================================================

    const stopCamera =
        useCallback(() => {
            if (
                autoCaptureTimerRef.current
            ) {
                clearTimeout(
                    autoCaptureTimerRef.current
                );

                autoCaptureTimerRef.current =
                    null;
            }

            if (
                streamRef.current
            ) {
                streamRef.current
                    .getTracks()
                    .forEach(
                        (track) =>
                            track.stop()
                    );

                streamRef.current =
                    null;
            }

            if (
                videoRef.current
            ) {
                videoRef.current.srcObject =
                    null;
            }
        }, []);

    // ==================================================
    // COMPONENT CLEANUP
    // ==================================================

    useEffect(() => {
        return () => {
            stopCamera();
            stopLocationWatch();
        };
    }, [
        stopCamera,
        stopLocationWatch,
    ]);

    // ==================================================
    // PHOTO PREVIEW CLEANUP
    // ==================================================

    useEffect(() => {
        return () => {
            if (photoPreview) {
                URL.revokeObjectURL(
                    photoPreview
                );
            }
        };
    }, [photoPreview]);

    // ==================================================
    // CAPTURE PHOTO
    // ==================================================

    const capturePhoto =
        useCallback(() => {
            if (
                autoCaptureStartedRef.current !==
                true
            ) {
                return;
            }

            const video =
                videoRef.current;

            const canvas =
                canvasRef.current;

            if (!video || !canvas) {
                return;
            }

            // ------------------------------------------------
            // IMPORTANT:
            // Don't capture until camera has a real frame.
            // ------------------------------------------------

            if (
                !video.videoWidth ||
                !video.videoHeight
            ) {
                autoCaptureTimerRef.current =
                    setTimeout(
                        () =>
                            capturePhoto(),
                        500
                    );

                return;
            }

            const width =
                video.videoWidth;

            const height =
                video.videoHeight;

            canvas.width =
                width;

            canvas.height =
                height;

            const ctx =
                canvas.getContext(
                    "2d"
                );

            if (!ctx) {
                return;
            }

            ctx.drawImage(
                video,
                0,
                0,
                width,
                height
            );

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        return;
                    }

                    const file =
                        new File(
                            [blob],
                            `attendance-${Date.now()}.jpg`,
                            {
                                type:
                                    "image/jpeg",
                            }
                        );

                    setPhoto(file);

                    setPhotoPreview(
                        URL.createObjectURL(
                            blob
                        )
                    );

                    setCameraState(
                        "captured"
                    );

                    autoCaptureStartedRef.current =
                        false;

                    stopCamera();
                },
                "image/jpeg",
                0.9
            );
        }, [stopCamera]);

    // ==================================================
    // CAMERA START
    // ==================================================

    const enableCamera =
        useCallback(async () => {
            if (
                completed ||
                photo ||
                autoCaptureStartedRef.current
            ) {
                return;
            }

            if (
                !navigator.mediaDevices?.getUserMedia
            ) {
                setCameraState(
                    "error"
                );

                setError(
                    "Camera API is unavailable in this browser."
                );

                return;
            }

            try {
                setError("");

                setCameraState(
                    "loading"
                );

                autoCaptureStartedRef.current =
                    true;

                // ------------------------------------------------
                // Request front camera.
                // ------------------------------------------------

                const stream =
                    await navigator.mediaDevices.getUserMedia(
                        {
                            video: {
                                facingMode:
                                    "user",

                                width: {
                                    ideal: 1280,
                                },

                                height: {
                                    ideal: 720,
                                },
                            },

                            audio: false,
                        }
                    );

                streamRef.current =
                    stream;

                setCameraState(
                    "ready"
                );

                // ------------------------------------------------
                // Attach stream.
                // ------------------------------------------------

                requestAnimationFrame(
                    () => {
                        const video =
                            videoRef.current;

                        if (!video) {
                            return;
                        }

                        video.srcObject =
                            stream;

                        video.muted =
                            true;

                        video.playsInline =
                            true;

                        const startCapture =
                            () => {
                                if (
                                    !autoCaptureStartedRef.current
                                ) {
                                    return;
                                }

                                if (
                                    autoCaptureTimerRef.current
                                ) {
                                    clearTimeout(
                                        autoCaptureTimerRef.current
                                    );
                                }

                                autoCaptureTimerRef.current =
                                    setTimeout(
                                        () =>
                                            capturePhoto(),
                                        CAMERA_DELAY
                                    );
                            };

                        video.onloadedmetadata =
                            () => {
                                video
                                    .play()
                                    .catch(
                                        () => {}
                                    );

                                startCapture();
                            };

                        video
                            .play()
                            .then(
                                () => {
                                    if (
                                        video.videoWidth &&
                                        video.videoHeight
                                    ) {
                                        startCapture();
                                    }
                                }
                            )
                            .catch(
                                () => {}
                            );
                    }
                );
            } catch (err) {
                autoCaptureStartedRef.current =
                    false;

                stopCamera();

                setCameraState(
                    "error"
                );

                if (
                    err.name ===
                    "NotAllowedError"
                ) {
                    setError(
                        "Camera permission was denied. Please allow camera access and reload the Attendance page."
                    );
                } else if (
                    err.name ===
                    "NotFoundError"
                ) {
                    setError(
                        "No camera was found on this device."
                    );
                } else {
                    setError(
                        err.message ||
                            "Unable to start the camera."
                    );
                }
            }
        }, [
            capturePhoto,
            completed,
            photo,
            stopCamera,
        ]);

    // ==================================================
    // START CAMERA AUTOMATICALLY
    // ==================================================
    //
    // First load:
    //     automatic check-in capture
    //
    // After check-in:
    //     fresh automatic checkout capture
    //
    // After completed:
    //     camera stays off.
    // ==================================================

    useEffect(() => {
        if (!context) {
            return;
        }

        if (completed) {
            stopCamera();
            return;
        }

        if (photo) {
            return;
        }

        enableCamera();
    }, [
        context,
        completed,
        photo,
        enableCamera,
        stopCamera,
    ]);

    // ==================================================
    // GET CURRENT LOCATION
    // ==================================================

    const getLocation =
        useCallback(() => {
            if (
                !navigator.geolocation
            ) {
                setLocationState(
                    "error"
                );

                setError(
                    "Your browser does not support GPS location."
                );

                return;
            }

            setLocationState(
                "loading"
            );

            setLocation(null);
            setLocationCapturedAt(null);
            setError("");

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const nextLocation =
                        {
                            latitude:
                                position.coords
                                    .latitude,

                            longitude:
                                position.coords
                                    .longitude,

                            accuracy:
                                position.coords
                                    .accuracy,
                        };

                    setLocation(
                        nextLocation
                    );

                    setLocationCapturedAt(
                        Date.now()
                    );

                    setLocationState(
                        "ready"
                    );
                },
                (err) => {
                    setLocationState(
                        "error"
                    );

                    if (
                        err.code ===
                        1
                    ) {
                        setError(
                            "Location permission was denied. Please allow location access in your browser."
                        );
                    } else if (
                        err.code ===
                        2
                    ) {
                        setError(
                            "Your current location could not be detected. Please move to an area with better GPS signal."
                        );
                    } else if (
                        err.code ===
                        3
                    ) {
                        setError(
                            "Location detection timed out. Please try again."
                        );
                    } else {
                        setError(
                            "Unable to detect your location."
                        );
                    }
                },
                {
                    enableHighAccuracy:
                        true,

                    timeout:
                        LOCATION_TIMEOUT,

                    maximumAge:
                        LOCATION_MAX_AGE,
                }
            );
        }, []);

    // ==================================================
    // AUTOMATIC LOCATION ON PAGE LOAD
    // ==================================================

    useEffect(() => {
        if (!context) {
            return;
        }

        // A completed attendance record should display the
        // saved checkout/check-in location. There is no new
        // attendance event to capture, so do not replace it
        // with the employee's current location.
        if (completed) {
            stopLocationWatch();
            return;
        }

        // Active attendance always obtains a fresh GPS position.
        getLocation();

        // ------------------------------------------------
        // Continuously watch GPS while attendance is active.
        // This helps prevent the location becoming stale.
        // ------------------------------------------------

        if (
            navigator.geolocation &&
            locationWatchRef.current ===
                null
        ) {
            locationWatchRef.current =
                navigator.geolocation.watchPosition(
                    (position) => {
                        setLocation({
                            latitude:
                                position.coords
                                    .latitude,

                            longitude:
                                position.coords
                                    .longitude,

                            accuracy:
                                position.coords
                                    .accuracy,
                        });

                        setLocationCapturedAt(
                            Date.now()
                        );

                        setLocationState(
                            "ready"
                        );
                    },
                    () => {
                        // Do not erase an already
                        // verified location when a
                        // background GPS update fails.
                    },
                    {
                        enableHighAccuracy:
                            true,

                        maximumAge: 5000,

                        timeout:
                            LOCATION_TIMEOUT,
                    }
                );
        }

        return () => {
            stopLocationWatch();
        };
    }, [
        context,
        completed,
        getLocation,
        stopLocationWatch,
    ]);

    // ==================================================
    // SUBMIT ATTENDANCE
    // ==================================================

    const submit = async (
        mode
    ) => {
        // ------------------------------------------------
        // STORE
        // ------------------------------------------------

        if (!selectedStore) {
            setError(
                "No assigned store is available for this account."
            );

            return;
        }

        // ------------------------------------------------
        // GPS
        // ------------------------------------------------

        if (!location || !locationCapturedAt) {
            setError(
                "Please wait for your current GPS location to be captured."
            );

            getLocation();

            return;
        }

        // ------------------------------------------------
        // PHOTO
        // ------------------------------------------------

        if (!photo) {
            setError(
                "Automatic photo capture has not completed yet. Please wait a moment."
            );

            return;
        }

        try {
            setBusy(true);

            setError("");

            setMessage("");

            // ------------------------------------------------
            // Stop camera before submission.
            // ------------------------------------------------

            stopCamera();

            // ------------------------------------------------
            // FORM DATA
            // ------------------------------------------------

            const formData =
                new FormData();

            // The backend does NOT trust this date for
            // timestamp generation. It calculates the
            // official India date itself.
            formData.append(
                "workDate",
                date
            );

            // Store is backend validated.
            formData.append(
                "storeId",
                selectedStore
            );

            formData.append(
                "latitude",
                String(
                    location.latitude
                )
            );

            formData.append(
                "longitude",
                String(
                    location.longitude
                )
            );

            formData.append(
                "accuracy",
                String(
                    location.accuracy || ""
                )
            );

            formData.append(
                "remarks",
                remarks
            );

            formData.append(
                "photo",
                photo
            );

            // ------------------------------------------------
            // API
            // ------------------------------------------------

            const data =
                mode === "check-in"
                    ? await checkIn(
                          formData
                      )
                    : await checkOut(
                          formData
                      );

            setMessage(
                data.message ||
                    "Attendance updated successfully."
            );

            setRemarks("");

            // ------------------------------------------------
            // AFTER CHECK-IN
            //
            // The old photo MUST NOT be reused for checkout.
            //
            // We clear it so a completely new automatic
            // checkout photo is captured.
            // ------------------------------------------------

            if (
                mode ===
                "check-in"
            ) {
                // A new session is now active again.
                setReadyForNewSession(false);

                if (
                    photoPreview
                ) {
                    URL.revokeObjectURL(
                        photoPreview
                    );
                }

                setPhoto(
                    null
                );

                setPhotoPreview(
                    ""
                );

                setCameraState(
                    "idle"
                );

                autoCaptureStartedRef.current =
                    false;
            }

            // ------------------------------------------------
            // Refresh from backend.
            //
            // This retrieves the actual saved server time.
            // ------------------------------------------------

            await load();

            // ------------------------------------------------
            // Refresh GPS after check-in.
            //
            // Checkout should use a fresh location.
            // ------------------------------------------------

            if (
                mode ===
                "check-in"
            ) {
                getLocation();
            } else {
                // Checkout is complete. Reset only the employee
                // workspace so a fresh check-in can start immediately.
                // The completed attendance row is NOT deleted or changed.
                setReadyForNewSession(true);

                if (photoPreview) {
                    URL.revokeObjectURL(photoPreview);
                }

                setPhoto(null);
                setPhotoPreview("");
                setCameraState("idle");
                setLocation(null);
                setLocationCapturedAt(null);
                setLocationState("idle");
                autoCaptureStartedRef.current = false;
            }
        } catch (err) {
            setError(
                err.response?.data
                    ?.message ||
                    "Unable to update attendance."
            );
        } finally {
            setBusy(false);
        }
    };

    // ==================================================
    // UI DATA
    // ==================================================

    const selectedStoreData =
        assignedStore;

    const locationLabel =
        locationState ===
        "ready"
            ? "Location captured"
            : locationState ===
                "loading"
              ? "Detecting location…"
              : "Location not verified";

    // ==================================================
    // RENDER
    // ==================================================

    return (
        <div className="attendance-page">
            <div className="attendance-shell">

                {/* ==================================================
                    HEADER
                ================================================== */}

                <header className="attendance-hero">
                    <div>
                        <div className="attendance-eyebrow">
                            <FaShieldAlt />
                            Workforce attendance
                        </div>

                        <h1>
                            Attendance
                        </h1>

                        <p>
                            Secure employee
                            check-in with
                            live GPS
                            verification and
                            automatic photo
                            evidence.
                        </p>
                    </div>

                    <div className="attendance-date-card">
                        <span>
                            {fmtDate(date)}
                        </span>

                        <strong>
                            {fmtLiveTime(
                                now
                            )}
                        </strong>

                        <small>
                            India Standard
                            Time
                        </small>
                    </div>
                </header>

                {/* ==================================================
                    ALERTS
                ================================================== */}

                {error && (
                    <div className="attendance-alert error">
                        <FaTimes />
                        <span>
                            {error}
                        </span>
                    </div>
                )}

                {message && (
                    <div className="attendance-alert success">
                        <FaCheckCircle />
                        <span>
                            {message}
                        </span>
                    </div>
                )}

                {/* ==================================================
                    KPIS
                ================================================== */}

                <section className="attendance-kpis">

                    <div className="attendance-kpi">
                        <span>
                            Work status
                        </span>

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
                        <span>
                            Check-in
                        </span>

                        <strong>
                            {fmtTime(
                                attendance?.check_in_at
                            )}
                        </strong>

                        <small>
                            {attendance?.check_in_at
                                ? "Recorded today"
                                : "Not recorded yet"}
                        </small>
                    </div>

                    <div className="attendance-kpi">
                        <span>
                            Location
                        </span>

                        <strong
                            className={
                                locationState ===
                                "ready"
                                    ? "active"
                                    : "ready"
                            }
                        >
                            {locationState ===
                            "ready"
                                ? "Verified"
                                : locationState ===
                                    "loading"
                                  ? "Detecting"
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
                        <span>
                            Today's hours
                        </span>

                        <strong>
                            {elapsed}
                        </strong>

                        <small>
                            {completed
                                ? "Final working duration"
                                : "Live session duration"}
                        </small>
                    </div>

                </section>

                {/* ==================================================
                    PROFILE + LOCATION
                ================================================== */}

                <section className="attendance-grid-top">

                    {/* PROFILE */}

                    <div className="attendance-card profile-card">

                        <div className="card-heading">
                            <div>
                                <span className="card-kicker">
                                    Employee
                                </span>

                                <h2>
                                    Your work
                                    profile
                                </h2>
                            </div>

                            <FaUserCircle />
                        </div>

                        <div className="profile-row">
                            <div className="profile-avatar">
                                <FaUserCircle />
                            </div>

                            <div>
                                <strong>
                                    {user?.name ||
                                        "Employee"}
                                </strong>

                                <span>
                                    {user?.employee_id ||
                                        "—"}{" "}
                                    ·{" "}
                                    {user?.designation ||
                                        "Team member"}
                                </span>
                            </div>
                        </div>

                        <div className="profile-meta">

                            <div>
                                <span>
                                    Department
                                </span>

                                <strong>
                                    {user?.department ||
                                        "—"}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Assigned store
                                </span>

                                <strong>
                                    {selectedStoreData?.store_name ||
                                        "No store assigned"}
                                </strong>

                                <small>
                                    {selectedStoreData?.store_code ||
                                        ""}
                                </small>
                            </div>

                        </div>

                    </div>

                    {/* LOCATION */}

                    <div className="attendance-card location-card">

                        <div className="card-heading">
                            <div>
                                <span className="card-kicker">
                                    Step 01
                                </span>

                                <h2>
                                    Location
                                    verification
                                </h2>
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
                                <strong>
                                    {
                                        locationLabel
                                    }
                                </strong>

                                <span>
                                    {location
                                        ? `${location.latitude.toFixed(
                                              5
                                          )}, ${location.longitude.toFixed(
                                              5
                                          )}`
                                        : "Waiting for your current GPS location…"}
                                </span>
                            </div>
                        </div>

                        <div className="location-actions">

                            <button
                                type="button"
                                className="attendance-btn secondary"
                                onClick={
                                    getLocation
                                }
                                disabled={
                                    locationState ===
                                    "loading"
                                }
                            >
                                <FaCrosshairs />

                                {locationState ===
                                "loading"
                                    ? "Detecting…"
                                    : "Refresh location"}
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

                {/* ==================================================
                    CAMERA + ACTION
                ================================================== */}

                <section className="attendance-card action-card">

                    <div className="card-heading action-heading">

                        <div>
                            <span className="card-kicker">
                                Step 02 · Secure
                                evidence
                            </span>

                            <h2>
                                {completed
                                    ? "Attendance completed"
                                    : checkedIn
                                      ? "Check-out workspace"
                                      : "Check-in workspace"}
                            </h2>

                            <p>
                                Your camera
                                captures the
                                attendance photo
                                automatically.
                                No manual
                                capture is
                                required.
                            </p>
                        </div>

                        <div className="live-chip">
                            <i />

                            {cameraState ===
                            "ready"
                                ? "Capturing automatically"
                                : cameraState ===
                                    "captured"
                                  ? "Photo captured"
                                  : cameraState ===
                                      "loading"
                                    ? "Starting camera"
                                    : "Camera off"}
                        </div>

                    </div>

                    <div className="action-layout">

                        {/* CAMERA */}

                        <div className="camera-panel">

                            <div className="camera-label">
                                <span>
                                    Camera
                                    evidence
                                </span>

                                <small>
                                    {photo
                                        ? "Automatic capture complete"
                                        : cameraState ===
                                                "loading" ||
                                            cameraState ===
                                                "ready"
                                          ? "Automatic capture in progress"
                                          : "Waiting for camera"}
                                </small>
                            </div>

                            <div className="camera-frame">

                                {photoPreview ? (
                                    <img
                                        src={
                                            photoPreview
                                        }
                                        alt="Automatic attendance capture"
                                    />
                                ) : cameraState ===
                                  "ready" ? (
                                    <video
                                        ref={
                                            videoRef
                                        }
                                        muted
                                        playsInline
                                        autoPlay
                                    />
                                ) : (
                                    <div className="camera-placeholder">
                                        <FaCamera />

                                        <strong>
                                            {cameraState ===
                                            "loading"
                                                ? "Starting camera…"
                                                : cameraState ===
                                                    "error"
                                                  ? "Camera unavailable"
                                                  : "Camera not active"}
                                        </strong>

                                        <span>
                                            {cameraState ===
                                            "error"
                                                ? "Allow camera access and reload the Attendance page."
                                                : "The camera starts automatically for attendance."}
                                        </span>
                                    </div>
                                )}

                                <canvas
                                    ref={
                                        canvasRef
                                    }
                                    hidden
                                />

                            </div>

                        </div>

                        {/* FORM */}

                        <div className="action-form">

                            {/* ASSIGNED STORE */}

                            <div className="assigned-store-lock">

                                <div>
                                    <span>
                                        Assigned store
                                    </span>

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

                            {/* READINESS */}

                            <div className="readiness-list">

                                <div
                                    className={
                                        location
                                            ? "ready"
                                            : ""
                                    }
                                >
                                    <FaMapMarkerAlt />

                                    <span>
                                        <strong>
                                            GPS
                                            location
                                        </strong>

                                        <small>
                                            {location
                                                ? "Captured and ready"
                                                : "Required before attendance"}
                                        </small>
                                    </span>

                                    <FaCheckCircle />
                                </div>

                                <div
                                    className={
                                        photo
                                            ? "ready"
                                            : ""
                                    }
                                >
                                    <FaCamera />

                                    <span>
                                        <strong>
                                            Photo
                                            evidence
                                        </strong>

                                        <small>
                                            {photo
                                                ? "Captured automatically and ready"
                                                : "Automatic capture required"}
                                        </small>
                                    </span>

                                    <FaCheckCircle />
                                </div>

                                <div
                                    className={
                                        selectedStoreData
                                            ? "ready"
                                            : ""
                                    }
                                >
                                    <FaStore />

                                    <span>
                                        <strong>
                                            Store
                                            assignment
                                        </strong>

                                        <small>
                                            {selectedStoreData
                                                ? selectedStoreData.store_name
                                                : "No store assigned"}
                                        </small>
                                    </span>

                                    <FaCheckCircle />
                                </div>

                            </div>

                            {/* REMARKS */}

                            <label>
                                Remarks /
                                comments

                                <textarea
                                    value={
                                        remarks
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setRemarks(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    placeholder="Add an optional attendance note…"
                                />
                            </label>

                            {/* SUBMIT */}

                            {!completed && (
                                <button
                                    type="button"
                                    className="attendance-submit"
                                    disabled={
                                        busy ||
                                        !location ||
                                        !photo ||
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

                {/* ==================================================
                    TIMELINE
                ================================================== */}

                <section className="attendance-card timeline-card">

                    <div className="card-heading">
                        <div>
                            <span className="card-kicker">
                                Today's activity
                            </span>

                            <h2>
                                Attendance
                                timeline
                            </h2>
                        </div>

                        <FaClock />
                    </div>

                    <div className="timeline">

                        <div className="timeline-item">

                            <i
                                className={
                                    checkedIn
                                        ? "done"
                                        : ""
                                }
                            />

                            <div>
                                <strong>
                                    Check-in
                                </strong>

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
                                    completed
                                        ? "done"
                                        : ""
                                }
                            />

                            <div>
                                <strong>
                                    Check-out
                                </strong>

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