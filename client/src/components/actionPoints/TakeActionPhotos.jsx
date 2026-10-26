import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "../../axiosConfig.js";
import {
    FaCamera,
    FaImages,
    FaTimes,
    FaLock,
    FaUserShield,
    FaPlus,
    FaExpand,
    FaChevronLeft,
    FaChevronRight,
    FaCloudUploadAlt
} from "react-icons/fa";
import { attachmentPath, openAttachment } from "../../utils/attachments";
import { MAX_ACTION_PHOTOS, compressPhoto } from "../../utils/actionPointPhotos";
import "../../styles/TakeActionPhotos.css";

// ======================================================
// TAKE ACTION – PHOTO EVIDENCE (premium glass design)
//
// <TakeActionPhotoField>  camera / gallery / drag & drop with previews
//                         photos = [{ file: File, url: "blob:..." }]
// <PhotoRuleAdminSwitch>  Administrator-only "Photo mandatory" on/off
// <PhotoRuleNote>         read-only note for everyone else
// <ActionPhotoThumbs>     secure thumbnails for the History timeline
// ======================================================

// Full-screen viewer for photos picked in the form.
function PhotoLightbox({ photos, index, onClose, onIndex }) {
    useEffect(() => {
        const onKey = (event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowRight") onIndex((index + 1) % photos.length);
            if (event.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [index, photos.length, onClose, onIndex]);

    const photo = photos[index];
    if (!photo) return null;

    // Rendered on <body>: the glass card's backdrop-filter would otherwise
    // trap this full-screen viewer inside the card.
    return createPortal(
        <div className="tap-lightbox" onClick={onClose} role="dialog" aria-label="Photo preview">
            <div className="tap-lightbox-frame" onClick={(e) => e.stopPropagation()}>
                <img src={photo.url} alt={`Action photo ${index + 1}`} />
                <div className="tap-lightbox-bar">
                    <span>Photo {index + 1} of {photos.length}</span>
                    <button type="button" className="tap-glass-icon" onClick={onClose} aria-label="Close preview">
                        <FaTimes />
                    </button>
                </div>
                {photos.length > 1 && (
                    <>
                        <button
                            type="button"
                            className="tap-glass-icon tap-lightbox-nav prev"
                            onClick={() => onIndex((index - 1 + photos.length) % photos.length)}
                            aria-label="Previous photo"
                        >
                            <FaChevronLeft />
                        </button>
                        <button
                            type="button"
                            className="tap-glass-icon tap-lightbox-nav next"
                            onClick={() => onIndex((index + 1) % photos.length)}
                            aria-label="Next photo"
                        >
                            <FaChevronRight />
                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}

export function TakeActionPhotoField({ photos, onChange, required = false, disabled = false, max = MAX_ACTION_PHOTOS }) {
    const cameraRef = useRef(null);
    const galleryRef = useRef(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [dragging, setDragging] = useState(false);
    const [viewIndex, setViewIndex] = useState(-1);

    const addFiles = async (fileList) => {
        const picked = Array.from(fileList || []);
        if (!picked.length) return;
        setError("");

        const room = max - photos.length;
        if (room <= 0) {
            setError(`You can attach up to ${max} photos.`);
            return;
        }

        const images = picked.filter(
            (file) => String(file.type || "").startsWith("image/") || /\.(heic|heif)$/i.test(file.name || "")
        );
        if (images.length < picked.length) setError("Only photos can be attached here.");

        setBusy(true);
        try {
            const ready = [];
            for (const file of images.slice(0, room)) {
                try {
                    const prepared = await compressPhoto(file);
                    ready.push({ file: prepared, url: URL.createObjectURL(prepared) });
                } catch {
                    setError(`"${file.name}" could not be read. Please use a JPG or PNG photo.`);
                }
            }
            if (images.length > room) setError(`Only ${max} photos are allowed – extra photos were skipped.`);
            if (ready.length) onChange([...photos, ...ready]);
        } finally {
            setBusy(false);
        }
    };

    const removeAt = (index) => {
        const target = photos[index];
        if (target?.url) URL.revokeObjectURL(target.url);
        onChange(photos.filter((_, i) => i !== index));
        setViewIndex(-1);
    };

    const onPick = (event) => {
        addFiles(event.target.files);
        event.target.value = ""; // allow picking the same file again
    };

    const locked = disabled || busy;
    const full = photos.length >= max;
    const missing = required && photos.length === 0;

    const dropProps = locked || full
        ? {}
        : {
            onDragOver: (e) => {
                e.preventDefault();
                setDragging(true);
            },
            onDragLeave: () => setDragging(false),
            onDrop: (e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(e.dataTransfer?.files);
            }
        };

    return (
        <section
            className={`tap-card${missing ? " is-required" : ""}${dragging ? " is-dragging" : ""}`}
            {...dropProps}
        >
            <header className="tap-card-head">
                <span className="tap-head-icon"><FaCamera /></span>
                <div className="tap-head-text">
                    <span className="tap-eyebrow">Photo evidence</span>
                    <strong>
                        Photo{" "}
                        {required
                            ? <span className="tap-badge tap-badge-required">Required</span>
                            : <span className="tap-badge">Optional</span>}
                    </strong>
                </div>
                <span className={`tap-count${full ? " is-full" : ""}`}>{photos.length}/{max}</span>
            </header>

            {photos.length === 0 ? (
                <div className="tap-dropzone">
                    <span className="tap-drop-icon"><FaCloudUploadAlt /></span>
                    <p className="tap-drop-title">
                        {busy ? "Preparing photo…" : "Add a photo of the action taken"}
                    </p>
                    <p className="tap-drop-sub">Take a new photo or upload one · JPG / PNG · up to {max}</p>
                    <div className="tap-actions">
                        <button
                            type="button"
                            className="tap-btn tap-btn-primary"
                            onClick={() => cameraRef.current?.click()}
                            disabled={locked}
                        >
                            <FaCamera /> Take Photo
                        </button>
                        <button
                            type="button"
                            className="tap-btn tap-btn-glass"
                            onClick={() => galleryRef.current?.click()}
                            disabled={locked}
                        >
                            <FaImages /> Upload Photo
                        </button>
                    </div>
                </div>
            ) : (
                <div className="tap-grid">
                    {photos.map((photo, index) => (
                        <figure className="tap-tile" key={photo.url}>
                            <button
                                type="button"
                                className="tap-tile-view"
                                onClick={() => setViewIndex(index)}
                                aria-label={`View photo ${index + 1}`}
                            >
                                <img src={photo.url} alt={`Action photo ${index + 1}`} />
                                <span className="tap-tile-zoom"><FaExpand /></span>
                            </button>
                            <span className="tap-tile-index">{index + 1}</span>
                            <button
                                type="button"
                                className="tap-tile-remove"
                                onClick={() => removeAt(index)}
                                disabled={disabled}
                                aria-label={`Remove photo ${index + 1}`}
                            >
                                <FaTimes />
                            </button>
                        </figure>
                    ))}

                    {!full && (
                        <div className="tap-tile tap-tile-add">
                            <button
                                type="button"
                                onClick={() => cameraRef.current?.click()}
                                disabled={locked}
                                aria-label="Take another photo"
                            >
                                <FaCamera />
                                <span>{busy ? "Wait…" : "Camera"}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => galleryRef.current?.click()}
                                disabled={locked}
                                aria-label="Upload another photo"
                            >
                                <FaPlus />
                                <span>Upload</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* capture="environment" opens the rear camera on phones/tablets;
                on a desktop it falls back to a normal file picker. */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
            <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={onPick} />

            {missing && !error && (
                <p className="tap-msg tap-msg-warn"><FaLock /> A photo is mandatory for this action (set by Admin).</p>
            )}
            {error && <p className="tap-msg tap-msg-error">{error}</p>}

            {viewIndex >= 0 && (
                <PhotoLightbox
                    photos={photos}
                    index={viewIndex}
                    onIndex={setViewIndex}
                    onClose={() => setViewIndex(-1)}
                />
            )}
        </section>
    );
}

// Administrator-only control. Users with "Full" access never see it
// (and the API rejects them with 403 anyway).
export function PhotoRuleAdminSwitch({ settings, onSaved }) {
    const [saving, setSaving] = useState(false);
    const mandatory = Number(settings?.photo_mandatory) === 1;
    const scope = settings?.mandatory_scope === "all" ? "all" : "close";

    const save = async (patch) => {
        try {
            setSaving(true);
            const res = await axios.put("/api/action-point-photo-settings", {
                photo_mandatory: mandatory ? 1 : 0,
                mandatory_scope: scope,
                ...patch
            });
            onSaved?.(res.data?.data);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || "Unable to save the photo rule.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className={`tap-rule${mandatory ? " is-on" : ""}`}>
            <div className="tap-rule-main">
                <span className="tap-rule-icon"><FaUserShield /></span>
                <div className="tap-rule-text">
                    <span className="tap-eyebrow">Admin only · all Action Points</span>
                    <strong>Photo mandatory</strong>
                    <small>{mandatory ? "Users must attach a photo" : "Photo is optional for users"}</small>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={mandatory}
                    aria-label="Photo mandatory"
                    className={`tap-switch${mandatory ? " on" : ""}`}
                    disabled={saving}
                    onClick={() => save({ photo_mandatory: mandatory ? 0 : 1 })}
                >
                    <span className="tap-switch-label off">OFF</span>
                    <span className="tap-switch-label on">ON</span>
                    <span className="tap-switch-knob" />
                </button>
            </div>

            {mandatory && (
                <div className="tap-segment" role="radiogroup" aria-label="When is the photo mandatory">
                    {[
                        ["close", "Only when closing"],
                        ["all", "Every action"]
                    ].map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={scope === value}
                            className={scope === value ? "active" : ""}
                            disabled={saving}
                            onClick={() => scope !== value && save({ mandatory_scope: value })}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </section>
    );
}

// Read-only note shown to non-admin users when the rule is ON.
export function PhotoRuleNote({ settings }) {
    if (Number(settings?.photo_mandatory) !== 1) return null;
    return (
        <div className="tap-note">
            <span className="tap-note-icon"><FaLock /></span>
            <span>
                Photo is <b>mandatory</b> {settings?.mandatory_scope === "all" ? "for every action" : "when closing"}
                <em> · set by Admin</em>
            </span>
        </div>
    );
}

// ------------------------------------------------------
// History thumbnails – loaded through the secure /api/files
// route with the user's login token.
// ------------------------------------------------------
function SecureThumb({ value, index }) {
    const [state, setState] = useState({ src: "", failed: false });

    useEffect(() => {
        let url = "";
        let active = true;
        const path = attachmentPath(value);
        if (!path) return undefined;
        axios
            .get("/api/files", { params: { path }, responseType: "blob" })
            .then((res) => {
                if (!active) return;
                url = URL.createObjectURL(res.data);
                setState({ src: url, failed: false });
            })
            .catch(() => {
                if (active) setState({ src: "", failed: true });
            });
        return () => {
            active = false;
            if (url) URL.revokeObjectURL(url);
        };
    }, [value]);

    return (
        <button
            type="button"
            className={`tap-history-thumb${state.src ? "" : " is-loading"}`}
            onClick={() => openAttachment(value)}
            title={`Open photo ${index + 1}`}
        >
            {state.src
                ? <img src={state.src} alt={`Action photo ${index + 1}`} />
                : <span>{state.failed ? <FaImages /> : ""}</span>}
            <span className="tap-history-zoom"><FaExpand /></span>
        </button>
    );
}

export function ActionPhotoThumbs({ photos = [] }) {
    if (!photos.length) return null;
    return (
        <div className="tap-history">
            <div className="tap-history-head">
                <FaCamera /> <b>Photos</b> <span>{photos.length}</span>
            </div>
            <div className="tap-history-row">
                {photos.map((value, index) => (
                    <SecureThumb key={`${value}-${index}`} value={value} index={index} />
                ))}
            </div>
        </div>
    );
}
