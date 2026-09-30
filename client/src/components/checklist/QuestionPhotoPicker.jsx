import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    FaCamera,
    FaImage,
    FaLink,
    FaTimes,
    FaPlus,
    FaSyncAlt,
    FaTrashAlt,
    FaCheck,
    FaExclamationCircle,
} from "react-icons/fa";
import "../../styles/checklist/QuestionPhotos.css";
import { newPhotoId as newId, fileToPhoto, releasePhoto, loadImage, isTouchDevice } from "../../utils/photoEvidence";

// ==========================================================
// QUESTION PHOTO PICKER
// ----------------------------------------------------------
// Photo evidence for ONE checklist question. Works the same on
// phones, laptops and desktops:
//
//   Open Camera        – phones: native camera
//                        laptops: live webcam capture window
//   Choose from Gallery– any image(s) on the device
//   From Website       – paste an image link (https://…)
//
// Photos are compressed in the browser (max 1600px JPEG) so
// store staff on mobile data upload quickly.
// ==========================================================

// ----------------------------------------------------------
// Modal shell (portal → works inside any page layout)
// ----------------------------------------------------------
function Sheet({ children, onClose, className = "" }) {
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose?.();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return createPortal(
        <div className="qp-overlay" onClick={onClose}>
            <div className={`qp-sheet ${className}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <span className="qp-grabber" aria-hidden="true" />
                {children}
            </div>
        </div>,
        document.body
    );
}

// ----------------------------------------------------------
// Live webcam capture (laptops / desktops)
// ----------------------------------------------------------
function CameraCapture({ onCapture, onClose, onFallback }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [error, setError] = useState("");
    const [facing, setFacing] = useState("environment");

    useEffect(() => {
        let alive = true;
        const start = async () => {
            try {
                streamRef.current?.getTracks().forEach((t) => t.stop());
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: facing, width: { ideal: 1600 }, height: { ideal: 1200 } },
                    audio: false,
                });
                if (!alive) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => {});
                }
            } catch {
                if (alive) setError("Camera is not available. Allow camera access or choose a photo from the device instead.");
            }
        };
        start();
        return () => {
            alive = false;
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, [facing]);

    const capture = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob(
            (blob) => {
                if (!blob) return;
                onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
            },
            "image/jpeg",
            0.9
        );
    };

    return (
        <Sheet onClose={onClose} className="qp-camera">
            <div className="qp-sheet-head">
                <h4>Take Photo</h4>
                <button type="button" className="qp-icon-btn" onClick={onClose} aria-label="Close"><FaTimes /></button>
            </div>
            {error ? (
                <div className="qp-camera-error">
                    <FaExclamationCircle />
                    <p>{error}</p>
                    <button type="button" className="qp-btn qp-btn-primary" onClick={onFallback}>
                        <FaImage /> Choose from device
                    </button>
                </div>
            ) : (
                <>
                    <div className="qp-camera-view">
                        <video ref={videoRef} playsInline muted />
                    </div>
                    <div className="qp-camera-actions">
                        <button
                            type="button"
                            className="qp-icon-btn"
                            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
                            aria-label="Switch camera"
                        >
                            <FaSyncAlt />
                        </button>
                        <button type="button" className="qp-shutter" onClick={capture} aria-label="Capture photo">
                            <span />
                        </button>
                        <span className="qp-icon-btn is-ghost" />
                    </div>
                </>
            )}
        </Sheet>
    );
}

// ----------------------------------------------------------
// Source chooser: camera / gallery / website
// ----------------------------------------------------------
function SourceSheet({ onPick, onClose, title = "Add Photo" }) {
    const [mode, setMode] = useState("menu");
    const [url, setUrl] = useState("");
    const [urlState, setUrlState] = useState("idle"); // idle | checking | ok | bad

    const validUrl = /^https?:\/\/\S+$/i.test(url.trim());

    useEffect(() => {
        if (!validUrl) return undefined;
        let alive = true;
        const timer = setTimeout(() => {
            setUrlState("checking");
            loadImage(url.trim())
                .then(() => alive && setUrlState("ok"))
                .catch(() => alive && setUrlState("bad"));
        }, 350);
        return () => {
            alive = false;
            clearTimeout(timer);
        };
    }, [url, validUrl]);

    return (
        <Sheet onClose={onClose}>
            <div className="qp-sheet-head">
                <h4>{mode === "url" ? "Add Image from Website" : title}</h4>
                <button type="button" className="qp-icon-btn" onClick={onClose} aria-label="Close"><FaTimes /></button>
            </div>

            {mode === "menu" ? (
                <div className="qp-options">
                    <button type="button" className="qp-option" onClick={() => onPick("camera")}>
                        <span className="qp-option-icon"><FaCamera /></span>
                        <span><b>Open Camera</b><small>Take a new photo</small></span>
                    </button>
                    <button type="button" className="qp-option" onClick={() => onPick("gallery")}>
                        <span className="qp-option-icon"><FaImage /></span>
                        <span><b>Choose from Gallery</b><small>Select from your device</small></span>
                    </button>
                    <button type="button" className="qp-option" onClick={() => setMode("url")}>
                        <span className="qp-option-icon"><FaLink /></span>
                        <span><b>From Website</b><small>Add image from URL</small></span>
                    </button>
                    <button type="button" className="qp-btn qp-btn-outline qp-cancel" onClick={onClose}>Cancel</button>
                </div>
            ) : (
                <div className="qp-url">
                    <label htmlFor="qp-url-input">Image link</label>
                    <input
                        id="qp-url-input"
                        type="url"
                        inputMode="url"
                        placeholder="https://example.com/photo.jpg"
                        value={url}
                        autoFocus
                        onChange={(e) => {
                            setUrl(e.target.value);
                            setUrlState("idle");
                        }}
                    />
                    <div className="qp-url-preview">
                        {validUrl && urlState === "ok" ? (
                            <img src={url.trim()} alt="Preview" />
                        ) : (
                            <span className={urlState === "bad" ? "is-bad" : ""}>
                                {!url.trim()
                                    ? "Paste a direct link to an image"
                                    : !validUrl
                                        ? "Link must start with http:// or https://"
                                        : urlState === "bad"
                                            ? "This link could not be previewed — it will still be saved as a link."
                                            : "Checking image…"}
                            </span>
                        )}
                    </div>
                    <div className="qp-row">
                        <button type="button" className="qp-btn qp-btn-outline" onClick={() => setMode("menu")}>Back</button>
                        <button
                            type="button"
                            className="qp-btn qp-btn-primary"
                            disabled={!validUrl || urlState === "checking"}
                            onClick={() => onPick("url", url.trim())}
                        >
                            <FaCheck /> Add Image
                        </button>
                    </div>
                </div>
            )}
        </Sheet>
    );
}

// ----------------------------------------------------------
// Full photo preview: change / remove
// ----------------------------------------------------------
function PreviewSheet({ photo, onChange, onRemove, onClose }) {
    return (
        <Sheet onClose={onClose} className="qp-preview">
            <div className="qp-sheet-head">
                <h4>Photo Preview</h4>
                <button type="button" className="qp-icon-btn" onClick={onClose} aria-label="Close"><FaTimes /></button>
            </div>
            <div className="qp-preview-img">
                <img src={photo.kind === "url" ? photo.url : photo.preview} alt="Question evidence" />
            </div>
            <div className="qp-row">
                <button type="button" className="qp-btn qp-btn-soft" onClick={onChange}>
                    <FaSyncAlt /> Change Photo
                </button>
                <button type="button" className="qp-btn qp-btn-danger" onClick={onRemove}>
                    <FaTrashAlt /> Remove
                </button>
            </div>
            <button type="button" className="qp-btn qp-btn-primary qp-block" onClick={onClose}>
                <FaCheck /> Confirm &amp; Save
            </button>
        </Sheet>
    );
}

// ==========================================================
// MAIN COMPONENT
// mode: "required" | "optional"
// ==========================================================
export default function QuestionPhotoPicker({
    questionId,
    photos = [],
    mode = "optional",
    missing = false,
    reason = "",
    onChange,
    disabled = false,
}) {
    const [sheet, setSheet] = useState(null); // null | "source" | "camera" | {preview: photo}
    const [replaceId, setReplaceId] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const galleryRef = useRef(null);
    const cameraRef = useRef(null);

    const required = mode === "required";

    const addPhotos = (items) => {
        if (!items.length) return;
        if (replaceId) {
            const [first, ...rest] = items;
            const next = [];
            photos.forEach((p) => {
                if (p.id === replaceId) {
                    releasePhoto(p);
                    next.push(first);
                } else next.push(p);
            });
            onChange([...next, ...rest]);
            setReplaceId(null);
        } else {
            onChange([...photos, ...items]);
        }
    };

    const handleFiles = async (fileList) => {
        const files = Array.from(fileList || []).filter((f) => f && (f.type?.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(f.name || "")));
        if (!files.length) return;
        setBusy(true);
        setError("");
        try {
            const results = [];
            for (const file of files.slice(0, 10)) {
                try {
                    results.push(await fileToPhoto(file));
                } catch (err) {
                    setError(err.message);
                }
            }
            addPhotos(results);
        } finally {
            setBusy(false);
        }
    };

    const pick = (source, value) => {
        if (source === "url") {
            addPhotos([{ id: newId(), kind: "url", url: value }]);
            setSheet(null);
            return;
        }
        setSheet(null);
        if (source === "gallery") {
            galleryRef.current?.click();
            return;
        }
        // camera
        const canLiveCapture = !isTouchDevice() && navigator.mediaDevices?.getUserMedia;
        if (canLiveCapture) setSheet("camera");
        else cameraRef.current?.click();
    };

    const openSource = (replace = null) => {
        if (disabled) return;
        setReplaceId(replace);
        setSheet("source");
    };

    const remove = (id) => {
        const target = photos.find((p) => p.id === id);
        releasePhoto(target);
        onChange(photos.filter((p) => p.id !== id));
    };

    const inputs = (
        <>
            <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                }}
            />
            <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                }}
            />
        </>
    );

    const sheets = (
        <>
            {sheet === "source" && <SourceSheet onPick={pick} onClose={() => { setSheet(null); setReplaceId(null); }} />}
            {sheet === "camera" && (
                <CameraCapture
                    onClose={() => { setSheet(null); setReplaceId(null); }}
                    onFallback={() => { setSheet(null); galleryRef.current?.click(); }}
                    onCapture={(file) => { setSheet(null); handleFiles([file]); }}
                />
            )}
            {sheet?.preview && (
                <PreviewSheet
                    photo={sheet.preview}
                    onClose={() => setSheet(null)}
                    onChange={() => openSource(sheet.preview.id)}
                    onRemove={() => { remove(sheet.preview.id); setSheet(null); }}
                />
            )}
        </>
    );

    const thumbs = photos.map((photo) => (
        <div key={photo.id} className="qp-thumb">
            <button
                type="button"
                className="qp-thumb-open"
                onClick={() => setSheet({ preview: photo })}
                aria-label="View photo"
            >
                <img
                    src={photo.kind === "url" ? photo.url : photo.preview}
                    alt=""
                    onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement?.classList.add("is-broken");
                    }}
                />
                {photo.kind === "url" && <span className="qp-thumb-tag"><FaLink /></span>}
            </button>
            {!disabled && (
                <button type="button" className="qp-thumb-x" onClick={() => remove(photo.id)} aria-label="Remove photo">
                    <FaTimes />
                </button>
            )}
        </div>
    ));

    // ------------- REQUIRED: big evidence box inside the question -------------
    if (required) {
        return (
            <div className={`qp-block-wrap ${missing ? "is-missing" : ""}`} data-question-photos={questionId}>
                {inputs}
                <div className="qp-label">
                    <span>Photo Evidence <i>*</i></span>
                    {reason && <small>{reason}</small>}
                </div>

                {photos.length === 0 ? (
                    <button type="button" className="qp-dropzone" onClick={() => openSource()} disabled={disabled || busy}>
                        <FaCamera />
                        <b>{busy ? "Processing photo…" : "Tap to add photo"} <i>*</i></b>
                        <small>Photo is required for this question</small>
                    </button>
                ) : (
                    <div className="qp-grid">
                        {thumbs}
                        <button type="button" className="qp-add-tile" onClick={() => openSource()} disabled={disabled || busy}>
                            {busy ? <span className="qp-spinner" /> : <FaCamera />}
                            <span>Add Another<br />Photo (Optional)</span>
                        </button>
                    </div>
                )}
                {error && <p className="qp-error">{error}</p>}
                {sheets}
            </div>
        );
    }

    // ------------- OPTIONAL: small button next to Remarks -------------
    return (
        <div className="qp-optional" data-question-photos={questionId}>
            {inputs}
            <button
                type="button"
                className={`qp-chip ${photos.length ? "has-photos" : ""}`}
                onClick={() => openSource()}
                disabled={disabled || busy}
            >
                {busy ? <span className="qp-spinner" /> : <FaCamera />}
                {photos.length ? `Photos (${photos.length})` : "Add Photo"}
                <small>Optional</small>
            </button>
            {photos.length > 0 && (
                <div className="qp-grid qp-grid--small">
                    {thumbs}
                    <button type="button" className="qp-add-tile" onClick={() => openSource()} disabled={disabled || busy}>
                        <FaPlus />
                        <span>Add</span>
                    </button>
                </div>
            )}
            {error && <p className="qp-error">{error}</p>}
            {sheets}
        </div>
    );
}
