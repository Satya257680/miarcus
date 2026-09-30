import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
    FaTimes,
    FaBolt,
    FaSyncAlt,
    FaArrowLeft,
    FaCamera,
    FaCheck,
    FaCheckCircle,
    FaRedoAlt,
    FaImages,
    FaMapMarkerAlt,
    FaLocationArrow,
    FaCalendarAlt,
    FaTag,
    FaExclamationTriangle,
    FaVideo,
} from "react-icons/fa";

import "../../styles/gallery/GalleryCamera.css";

// ==========================================================
// GalleryCamera
// Full-screen, phone-style camera for the Gallery.
//
//  1. Camera   – live preview from the phone's real camera,
//                back / front switch, flash (torch), photo +
//                video mode, shutter, pick from phone gallery.
//  2. Details  – preview + description (required), category,
//                location and GPS.
//  3. Upload   – progress (Preparing → Uploading → Saving).
//  4. Success  – summary, "View in Gallery" / "Add Another".
//
// If the browser cannot open the camera stream (HTTP page,
// permission blocked, old browser) it falls back to the
// phone's native camera app via <input capture>.
// ==========================================================

const MAX_DESCRIPTION = 500;
const MAX_VIDEO_SECONDS = 60;
const DEFAULT_CATEGORY = "Store Photos";

const pad = (value) => String(value).padStart(2, "0");

const stampName = (prefix, ext) => {
    const d = new Date();
    return `${prefix}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.${ext}`;
};

const formatSize = (bytes) => {
    const size = Number(bytes || 0);
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatNow = (date) =>
    date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });

const pickRecorderMime = () => {
    if (typeof window.MediaRecorder === "undefined") return "";
    const candidates = [
        "video/mp4;codecs=avc1,mp4a",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
    ];
    return candidates.find((type) => {
        try {
            return window.MediaRecorder.isTypeSupported(type);
        } catch {
            return false;
        }
    }) || "";
};

const cameraSupported = () =>
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function" &&
    (window.isSecureContext !== false);

export default function GalleryCamera({
    open,
    onClose,
    onUploaded,
    onViewGallery,
    categories = [],
    locations = [],
}) {
    // ---------------- state ----------------
    const [step, setStep] = useState("camera"); // camera | details | uploading | success
    const [mode, setMode] = useState("photo"); // photo | video
    const [facing, setFacing] = useState("environment");
    const [streamReady, setStreamReady] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [torchSupported, setTorchSupported] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [hasMultipleCameras, setHasMultipleCameras] = useState(true);
    const [flashAnim, setFlashAnim] = useState(false);

    const [recording, setRecording] = useState(false);
    const [recordSeconds, setRecordSeconds] = useState(0);

    const [capturedFile, setCapturedFile] = useState(null);
    const [capturedUrl, setCapturedUrl] = useState("");

    const [description, setDescription] = useState("");
    const [category, setCategory] = useState(DEFAULT_CATEGORY);
    const [customCategory, setCustomCategory] = useState("");
    const [locationValue, setLocationValue] = useState("head_office");

    const [gps, setGps] = useState(null); // { lat, lng, accuracy }
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState("");

    const [formError, setFormError] = useState("");
    const [progress, setProgress] = useState(0);
    const [uploadStage, setUploadStage] = useState(0); // 0 preparing, 1 uploading, 2 saving, 3 done
    const [uploadedAt, setUploadedAt] = useState(null);

    // ---------------- refs ----------------
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const recorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(0);
    const nativeBackInput = useRef(null);
    const nativeFrontInput = useRef(null);
    const pickInput = useRef(null);
    const sessionRef = useRef(0); // guards against late getUserMedia results

    const storeLocations = useMemo(
        () => (locations || []).filter((item) => item.location_type === "store"),
        [locations]
    );

    const categoryOptions = useMemo(() => {
        const names = new Set([DEFAULT_CATEGORY, "Store Visit", "Display", "Inventory", "Maintenance"]);
        (categories || []).forEach((item) => item?.category && names.add(item.category));
        return Array.from(names);
    }, [categories]);

    const locationName = useMemo(() => {
        if (locationValue === "head_office") return "Head Office";
        const id = locationValue.replace("store:", "");
        return storeLocations.find((item) => String(item.id) === String(id))?.name || "Store";
    }, [locationValue, storeLocations]);

    const finalCategory = category === "__custom" ? customCategory.trim() : category;

    // ======================================================
    // STREAM HANDLING
    // ======================================================

    const stopStream = useCallback(() => {
        sessionRef.current += 1;
        const stream = streamRef.current;
        if (stream) {
            stream.getTracks().forEach((track) => {
                try { track.stop(); } catch { /* ignore */ }
            });
        }
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setStreamReady(false);
        setTorchOn(false);
        setTorchSupported(false);
    }, []);

    const startStream = useCallback(async (facingMode, withAudio) => {
        stopStream();
        const session = sessionRef.current;
        setCameraError("");

        if (!cameraSupported()) {
            setCameraError("unsupported");
            return;
        }

        const videoConstraints = {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
        };

        try {
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: videoConstraints,
                    audio: !!withAudio,
                });
            } catch (firstError) {
                // Microphone refused → still allow silent video / photos
                if (withAudio && firstError?.name === "NotAllowedError") {
                    stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
                } else if (firstError?.name === "OverconstrainedError") {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: !!withAudio });
                } else {
                    throw firstError;
                }
            }

            // The camera was closed / switched while we were waiting
            if (session !== sessionRef.current) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }

            streamRef.current = stream;

            const video = videoRef.current;
            if (video) {
                video.srcObject = stream;
                video.setAttribute("playsinline", "true");
                video.muted = true;
                await video.play().catch(() => {});
            }

            const [track] = stream.getVideoTracks();
            const caps = track?.getCapabilities ? track.getCapabilities() : {};
            setTorchSupported(!!caps?.torch);
            setStreamReady(true);

            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const cams = devices.filter((device) => device.kind === "videoinput");
                setHasMultipleCameras(cams.length !== 1);
            } catch {
                setHasMultipleCameras(true);
            }
        } catch (error) {
            if (session !== sessionRef.current) return;
            const name = error?.name || "";
            if (name === "NotAllowedError" || name === "SecurityError") setCameraError("denied");
            else if (name === "NotFoundError" || name === "OverconstrainedError") setCameraError("notfound");
            else setCameraError("failed");
        }
    }, [stopStream]);

    // (Re)start the camera while on the camera step
    useEffect(() => {
        if (!open || step !== "camera") return undefined;
        startStream(facing, mode === "video");
        return () => stopStream();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, step, facing, mode]);

    // Stop the camera when the tab goes to the background
    useEffect(() => {
        if (!open) return undefined;
        const onVisible = () => {
            if (document.visibilityState === "hidden") {
                if (recorderRef.current?.state === "recording") recorderRef.current.stop();
                stopStream();
            } else if (step === "camera") {
                startStream(facing, mode === "video");
            }
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
    }, [open, step, facing, mode, startStream, stopStream]);

    // Lock page scroll while the camera is open
    useEffect(() => {
        if (!open) return undefined;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previous; };
    }, [open]);

    // Preview URL for the captured file
    useEffect(() => {
        if (!capturedFile) {
            setCapturedUrl("");
            return undefined;
        }
        const url = URL.createObjectURL(capturedFile);
        setCapturedUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [capturedFile]);

    // ======================================================
    // GPS
    // ======================================================

    const captureGps = useCallback(() => {
        if (!navigator.geolocation) {
            setGpsError("Location is not supported on this device.");
            return;
        }
        setGpsLoading(true);
        setGpsError("");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGps({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
                });
                setGpsLoading(false);
            },
            (err) => {
                const messages = {
                    1: "Location permission denied. Please allow location access.",
                    2: "Current location could not be determined.",
                    3: "Location request timed out. Tap retry.",
                };
                setGpsError(messages[err?.code] || "Unable to get your location.");
                setGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
    }, []);

    // Grab GPS in the background as soon as the camera opens
    useEffect(() => {
        if (open && !gps && !gpsLoading) captureGps();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // ======================================================
    // CAPTURE
    // ======================================================

    const vibrate = (ms = 25) => {
        try { navigator.vibrate?.(ms); } catch { /* ignore */ }
    };

    const goToDetails = (file) => {
        setCapturedFile(file);
        setFormError("");
        setStep("details");
    };

    const takePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !streamReady || !video.videoWidth) return;

        vibrate(30);
        setFlashAnim(true);
        window.setTimeout(() => setFlashAnim(false), 260);

        const width = video.videoWidth;
        const height = video.videoHeight;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.save();
        // Save the selfie exactly as it was seen in the preview
        if (facing === "user") {
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();

        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                const file = new File([blob], stampName("Store_Image", "jpg"), {
                    type: "image/jpeg",
                    lastModified: Date.now(),
                });
                goToDetails(file);
            },
            "image/jpeg",
            0.9
        );
    };

    const stopRecording = useCallback(() => {
        window.clearInterval(timerRef.current);
        const recorder = recorderRef.current;
        if (recorder && recorder.state !== "inactive") recorder.stop();
        setRecording(false);
    }, []);

    const startRecording = () => {
        const stream = streamRef.current;
        if (!stream || typeof window.MediaRecorder === "undefined") {
            setCameraError("novideo");
            return;
        }

        const mimeType = pickRecorderMime();
        let recorder;
        try {
            recorder = new window.MediaRecorder(stream, {
                ...(mimeType ? { mimeType } : {}),
                videoBitsPerSecond: 2_500_000,
            });
        } catch {
            recorder = new window.MediaRecorder(stream);
        }

        chunksRef.current = [];
        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size) chunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
            const rawType = (recorder.mimeType || mimeType || "video/webm").split(";")[0];
            const isMp4 = rawType.includes("mp4");
            const type = isMp4 ? "video/mp4" : "video/webm";
            const blob = new Blob(chunksRef.current, { type });
            chunksRef.current = [];
            if (!blob.size) return;
            const file = new File([blob], stampName("Store_Video", isMp4 ? "mp4" : "webm"), {
                type,
                lastModified: Date.now(),
            });
            goToDetails(file);
        };

        recorderRef.current = recorder;
        recorder.start(1000);
        vibrate(40);
        setRecordSeconds(0);
        setRecording(true);

        const startedAt = Date.now();
        timerRef.current = window.setInterval(() => {
            const seconds = Math.floor((Date.now() - startedAt) / 1000);
            setRecordSeconds(seconds);
            if (seconds >= MAX_VIDEO_SECONDS) stopRecording();
        }, 250);
    };

    useEffect(() => () => window.clearInterval(timerRef.current), []);

    const onShutter = () => {
        if (mode === "photo") takePhoto();
        else if (recording) stopRecording();
        else startRecording();
    };

    const switchCamera = () => {
        if (recording) return;
        vibrate(15);
        setFacing((prev) => (prev === "environment" ? "user" : "environment"));
    };

    const toggleTorch = async () => {
        const track = streamRef.current?.getVideoTracks?.()[0];
        if (!track || !torchSupported) return;
        try {
            await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
            setTorchOn((value) => !value);
        } catch {
            setTorchSupported(false);
        }
    };

    const onNativeFile = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (file.size > 100 * 1024 * 1024) {
            setFormError("The file must be 100 MB or smaller.");
            return;
        }
        goToDetails(file);
    };

    // ======================================================
    // UPLOAD
    // ======================================================

    const retake = () => {
        setCapturedFile(null);
        setFormError("");
        setStep("camera");
    };

    const submit = async (event) => {
        event?.preventDefault?.();

        if (!capturedFile) {
            setFormError("Please take a photo first.");
            return;
        }
        if (!description.trim()) {
            setFormError("Please describe the photo.");
            return;
        }
        if (!finalCategory) {
            setFormError("Please choose a category.");
            return;
        }
        if (!gps) {
            setFormError("Please allow location so the photo can be tagged with GPS.");
            captureGps();
            return;
        }

        setFormError("");
        setProgress(0);
        setUploadStage(0);
        setStep("uploading");

        try {
            const formData = new FormData();
            formData.append("photo", capturedFile);
            formData.append("category", finalCategory);
            formData.append("description", description.trim());

            if (locationValue === "head_office") {
                formData.append("location_type", "head_office");
            } else {
                formData.append("location_type", "store");
                formData.append("store_id", locationValue.replace("store:", ""));
            }

            formData.append("latitude", gps.lat);
            formData.append("longitude", gps.lng);
            if (gps.accuracy !== null) formData.append("location_accuracy", gps.accuracy);

            window.setTimeout(() => setUploadStage((s) => Math.max(s, 1)), 350);

            await axios.post("/api/gallery/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (e) => {
                    if (!e.total) return;
                    const pct = Math.round((e.loaded / e.total) * 100);
                    setProgress(Math.min(95, pct));
                    setUploadStage((s) => Math.max(s, pct >= 100 ? 2 : 1));
                },
            });

            setProgress(100);
            setUploadStage(3);
            setUploadedAt(new Date());
            vibrate(50);
            window.setTimeout(() => setStep("success"), 450);
            onUploaded?.();
        } catch (error) {
            setFormError(error?.response?.data?.message || "Unable to upload. Please try again.");
            setStep("details");
        }
    };

    const addAnother = () => {
        setCapturedFile(null);
        setDescription("");
        setFormError("");
        setProgress(0);
        setUploadStage(0);
        setStep("camera");
    };

    const close = () => {
        if (step === "uploading") return;
        if (recording) stopRecording();
        stopStream();
        setStep("camera");
        setCapturedFile(null);
        setDescription("");
        setFormError("");
        setProgress(0);
        setUploadStage(0);
        onClose?.();
    };

    if (!open) return null;

    const isVideo = capturedFile?.type?.startsWith("video/");
    const recordLabel = `${pad(Math.floor(recordSeconds / 60))}:${pad(recordSeconds % 60)}`;

    // ======================================================
    // RENDER
    // ======================================================

    const ui = (
        <div className={`gcam gcam--${step}`} role="dialog" aria-modal="true" aria-label="Gallery camera">

            {/* hidden native pickers (fallback + phone gallery) */}
            <input ref={nativeBackInput} type="file" accept="image/*" capture="environment" hidden onChange={onNativeFile} />
            <input ref={nativeFrontInput} type="file" accept="image/*" capture="user" hidden onChange={onNativeFile} />
            <input ref={pickInput} type="file" accept="image/*,video/*" hidden onChange={onNativeFile} />
            <canvas ref={canvasRef} hidden />

            {/* ================= CAMERA ================= */}
            {step === "camera" && (
                <div className="gcam-camera">
                    <video
                        ref={videoRef}
                        className={`gcam-video ${facing === "user" ? "is-mirrored" : ""} ${streamReady ? "is-ready" : ""}`}
                        autoPlay
                        playsInline
                        muted
                    />

                    {flashAnim && <div className="gcam-flash" />}

                    <div className="gcam-topbar">
                        <button type="button" className="gcam-round" onClick={close} aria-label="Close camera">
                            <FaTimes />
                        </button>

                        {recording ? (
                            <span className="gcam-rec"><i /> {recordLabel}</span>
                        ) : (
                            <span className="gcam-gps-pill">
                                <FaMapMarkerAlt />
                                {gps ? "GPS on" : gpsLoading ? "Locating…" : "No GPS"}
                            </span>
                        )}

                        <button
                            type="button"
                            className={`gcam-round ${torchOn ? "is-on" : ""}`}
                            onClick={toggleTorch}
                            disabled={!torchSupported}
                            aria-label="Flash"
                            title={torchSupported ? "Flash" : "Flash not available"}
                        >
                            <FaBolt />
                        </button>
                    </div>

                    {cameraError && (
                        <div className="gcam-error">
                            <span className="gcam-error-icon"><FaCamera /></span>
                            <h3>
                                {cameraError === "denied"
                                    ? "Camera permission needed"
                                    : cameraError === "notfound"
                                        ? "No camera found"
                                        : cameraError === "novideo"
                                            ? "Video recording not supported"
                                            : "Open your phone camera"}
                            </h3>
                            <p>
                                {cameraError === "denied"
                                    ? "Allow camera access in your browser settings, or use the phone camera below."
                                    : cameraError === "novideo"
                                        ? "This browser can't record video here. Switch to photo, or use your phone camera."
                                        : "Your browser couldn't start the live camera here. Use your phone's camera app instead."}
                            </p>
                            <div className="gcam-error-actions">
                                <button type="button" className="gcam-pill-btn" onClick={() => nativeBackInput.current?.click()}>
                                    <FaCamera /> Back camera
                                </button>
                                <button type="button" className="gcam-pill-btn ghost" onClick={() => nativeFrontInput.current?.click()}>
                                    <FaSyncAlt /> Front camera
                                </button>
                            </div>
                            {cameraError !== "unsupported" && (
                                <button type="button" className="gcam-link" onClick={() => startStream(facing, mode === "video")}>
                                    Try live camera again
                                </button>
                            )}
                        </div>
                    )}

                    <div className="gcam-bottom">
                        <div className="gcam-modes" role="tablist" aria-label="Camera mode">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={mode === "photo"}
                                className={mode === "photo" ? "active" : ""}
                                onClick={() => !recording && setMode("photo")}
                            >
                                PHOTO
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={mode === "video"}
                                className={mode === "video" ? "active" : ""}
                                onClick={() => !recording && setMode("video")}
                            >
                                VIDEO
                            </button>
                        </div>

                        <div className="gcam-controls">
                            <button
                                type="button"
                                className="gcam-thumb"
                                onClick={() => !recording && pickInput.current?.click()}
                                aria-label="Choose from phone gallery"
                                disabled={recording}
                            >
                                <FaImages />
                            </button>

                            <button
                                type="button"
                                className={`gcam-shutter ${mode === "video" ? "is-video" : ""} ${recording ? "is-recording" : ""}`}
                                onClick={onShutter}
                                disabled={!streamReady}
                                aria-label={mode === "photo" ? "Take photo" : recording ? "Stop recording" : "Start recording"}
                            >
                                <span />
                            </button>

                            <button
                                type="button"
                                className="gcam-round gcam-switch"
                                onClick={switchCamera}
                                disabled={recording || !hasMultipleCameras}
                                aria-label={facing === "environment" ? "Switch to front camera" : "Switch to back camera"}
                            >
                                <FaSyncAlt />
                            </button>
                        </div>

                        <span className="gcam-facing-label">
                            {facing === "environment" ? "Back camera" : "Front camera"}
                            {mode === "video" && !recording ? ` · max ${MAX_VIDEO_SECONDS}s` : ""}
                        </span>
                    </div>
                </div>
            )}

            {/* ================= DETAILS ================= */}
            {step === "details" && (
                <form className="gcam-sheet" onSubmit={submit}>
                    <header className="gcam-sheet-head">
                        <button type="button" className="gcam-back" onClick={retake} aria-label="Back to camera">
                            <FaArrowLeft />
                        </button>
                        <h2>{isVideo ? "Preview Video" : "Preview Photo"}</h2>
                    </header>

                    <div className="gcam-preview">
                        {capturedUrl && (isVideo ? (
                            <video src={capturedUrl} controls playsInline />
                        ) : (
                            <img src={capturedUrl} alt="Captured" />
                        ))}
                        <button type="button" className="gcam-preview-x" onClick={retake} aria-label="Discard and retake">
                            <FaTimes />
                        </button>
                        <span className="gcam-preview-meta">
                            {capturedFile?.name} · {formatSize(capturedFile?.size)}
                        </span>
                    </div>

                    <section className="gcam-card">
                        <div className="gcam-card-head">
                            <span className="gcam-card-icon">{isVideo ? <FaVideo /> : <FaCamera />}</span>
                            <div>
                                <h3>Add Details</h3>
                                <p>Please provide information about this {isVideo ? "video" : "photo"}.</p>
                            </div>
                        </div>

                        <label className="gcam-field">
                            <span>Description <b>*</b></span>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                                placeholder="e.g. Front display of kids section – new collection arranged properly."
                                rows={3}
                                autoFocus
                                required
                            />
                            <small className="gcam-count">{description.length}/{MAX_DESCRIPTION}</small>
                        </label>

                        <label className="gcam-field">
                            <span>Category <b>*</b></span>
                            <select value={category} onChange={(e) => setCategory(e.target.value)}>
                                {categoryOptions.map((name) => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                                <option value="__custom">Other (type your own)…</option>
                            </select>
                        </label>

                        {category === "__custom" && (
                            <label className="gcam-field">
                                <span>New category <b>*</b></span>
                                <input
                                    value={customCategory}
                                    onChange={(e) => setCustomCategory(e.target.value.slice(0, 100))}
                                    placeholder="Type a category name"
                                />
                            </label>
                        )}

                        <label className="gcam-field">
                            <span>Location <b>*</b></span>
                            <select value={locationValue} onChange={(e) => setLocationValue(e.target.value)}>
                                <option value="head_office">Head Office</option>
                                {storeLocations.map((item) => (
                                    <option key={item.id} value={`store:${item.id}`}>
                                        {item.name}{item.code ? ` — ${item.code}` : ""}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className={`gcam-gps ${gps ? "ok" : gpsError ? "err" : ""}`}>
                            <FaLocationArrow />
                            <span>
                                {gps
                                    ? `GPS captured · ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}${gps.accuracy ? ` · ±${Math.round(gps.accuracy)} m` : ""}`
                                    : gpsLoading
                                        ? "Getting your current location…"
                                        : gpsError || "Location not captured yet."}
                            </span>
                            {!gps && !gpsLoading && (
                                <button type="button" onClick={captureGps}>Retry</button>
                            )}
                        </div>

                        {formError && (
                            <div className="gcam-form-error">
                                <FaExclamationTriangle /> {formError}
                            </div>
                        )}
                    </section>

                    <footer className="gcam-sheet-actions">
                        <button type="button" className="gcam-btn ghost" onClick={retake}>
                            <FaRedoAlt /> Retake
                        </button>
                        <button type="submit" className="gcam-btn primary" disabled={!description.trim()}>
                            <FaCheck /> Save &amp; Upload
                        </button>
                    </footer>
                </form>
            )}

            {/* ================= UPLOADING ================= */}
            {step === "uploading" && (
                <div className="gcam-sheet gcam-center">
                    <header className="gcam-sheet-head">
                        <span className="gcam-back is-disabled"><FaArrowLeft /></span>
                        <h2>Uploading</h2>
                    </header>

                    <div className="gcam-upload">
                        <div className="gcam-upload-thumb">
                            {capturedUrl && (isVideo ? <video src={capturedUrl} muted playsInline /> : <img src={capturedUrl} alt="" />)}
                        </div>
                        <strong>{capturedFile?.name}</strong>
                        <small>{formatSize(capturedFile?.size)}</small>

                        <div className="gcam-progress">
                            <div className="gcam-progress-bar"><i style={{ width: `${progress}%` }} /></div>
                            <span>{progress}%</span>
                        </div>

                        <ul className="gcam-steps">
                            {["Preparing file…", "Uploading to server…", "Saving details…"].map((label, index) => (
                                <li key={label} className={uploadStage > index ? "done" : uploadStage === index ? "active" : ""}>
                                    <span>{uploadStage > index ? <FaCheck /> : <i />}</span>
                                    {label}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* ================= SUCCESS ================= */}
            {step === "success" && (
                <div className="gcam-sheet gcam-center">
                    <header className="gcam-sheet-head">
                        <button type="button" className="gcam-back" onClick={close} aria-label="Close">
                            <FaArrowLeft />
                        </button>
                    </header>

                    <div className="gcam-success">
                        <span className="gcam-success-badge"><FaCheckCircle /></span>
                        <h2>{isVideo ? "Video" : "Photo"} Uploaded Successfully!</h2>
                        <p>Your {isVideo ? "video" : "photo"} has been added to the gallery with details.</p>

                        <div className="gcam-summary">
                            <div className="gcam-summary-top">
                                <div className="gcam-summary-thumb">
                                    {capturedUrl && (isVideo ? <video src={capturedUrl} muted playsInline /> : <img src={capturedUrl} alt="" />)}
                                </div>
                                <p>{description}</p>
                            </div>
                            <dl>
                                <div><dt><FaTag /> Category</dt><dd>{finalCategory}</dd></div>
                                <div><dt><FaMapMarkerAlt /> Location</dt><dd>{locationName}</dd></div>
                                <div><dt><FaCalendarAlt /> Date</dt><dd>{uploadedAt ? formatNow(uploadedAt) : "—"}</dd></div>
                            </dl>
                        </div>

                        <button
                            type="button"
                            className="gcam-btn primary block"
                            onClick={() => {
                                close();
                                onViewGallery?.();
                            }}
                        >
                            View in Gallery
                        </button>
                        <button type="button" className="gcam-btn soft block" onClick={addAnother}>
                            <FaCamera /> Add Another Photo
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(ui, document.body);
}
