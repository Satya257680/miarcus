import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
    FaCamera,
    FaCloudUploadAlt,
    FaDownload,
    FaFilter,
    FaImages,
    FaMobileAlt,
    FaPlus,
    FaSearch,
    FaTimes,
    FaTrash,
    FaQrcode,
    FaChevronLeft,
    FaChevronRight,
    FaMapMarkerAlt,
    FaLocationArrow,
    FaLayerGroup,
    FaFilePdf,
    FaFileAlt,
    FaFileWord,
    FaFileExcel,
    FaFilePowerpoint,
    FaFileArchive,
    FaFileVideo,
    FaFileAudio
} from "react-icons/fa";
import "../styles/Gallery.css";

const getStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
};

const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleString([], {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

const formatSize = (bytes) => {
    const size = Number(bytes || 0);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

// Gallery files are private API resources, so previews are fetched with the
// authenticated axios client and exposed only as temporary in-memory URLs.
const fileKind = (mime = "") => {
    const value = String(mime).toLowerCase();
    if (value.startsWith("image/")) return "image";
    if (value.startsWith("video/")) return "video";
    if (value.startsWith("audio/")) return "audio";
    if (value === "application/pdf") return "pdf";
    if (value.includes("word") || value.includes("msword")) return "word";
    if (value.includes("excel") || value.includes("spreadsheet") || value === "text/csv") return "excel";
    if (value.includes("powerpoint") || value.includes("presentation")) return "powerpoint";
    if (value.includes("zip") || value.includes("compressed")) return "archive";
    return "file";
};

const FileTypeIcon = ({ mime, large = false }) => {
    const kind = fileKind(mime);
    const Icon = {
        pdf: FaFilePdf,
        word: FaFileWord,
        excel: FaFileExcel,
        powerpoint: FaFilePowerpoint,
        archive: FaFileArchive,
        video: FaFileVideo,
        audio: FaFileAudio
    }[kind] || FaFileAlt;

    return (
        <div className={`gallery-file-icon ${large ? "large" : ""}`}>
            <Icon />
            <span>{String(mime || "file").split("/").pop().toUpperCase()}</span>
        </div>
    );
};

function ProtectedGalleryFile({ file, alt, className = "", compact = false }) {
    const [src, setSrc] = useState("");
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;
        let objectUrl = "";

        setSrc("");
        setFailed(false);

        if (!file?.id) return undefined;

        axios.get(`/api/gallery/${file.id}/file`, {
            responseType: "blob"
        }).then(response => {
            if (!active) return;
            objectUrl = URL.createObjectURL(response.data);
            setSrc(objectUrl);
        }).catch(() => {
            if (active) setFailed(true);
        });

        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [file?.id]);

    const kind = fileKind(file?.mime_type);

    if (failed) {
        return (
            <div className={`gallery-file-preview failed ${className}`}>
                <FileTypeIcon mime={file?.mime_type} large={!compact} />
                <span>Unable to load file</span>
            </div>
        );
    }

    if (!src) {
        return (
            <div className={`gallery-file-preview loading ${className}`}>
                <FaCloudUploadAlt />
                <span>Loading file…</span>
            </div>
        );
    }

    if (kind === "image") {
        return (
            <img
                className={className}
                src={src}
                alt={alt || file.file_name || "Gallery file"}
                loading="lazy"
            />
        );
    }

    if (kind === "video") {
        return (
            <video
                className={`gallery-media-preview ${className}`}
                src={src}
                controls={!compact}
                muted={compact}
                playsInline
                preload="metadata"
                aria-label={alt || file.file_name}
            />
        );
    }

    if (kind === "audio") {
        return (
            <div className={`gallery-file-preview ${className}`}>
                <FileTypeIcon mime={file?.mime_type} large={!compact} />
                <audio src={src} controls />
            </div>
        );
    }

    if (kind === "pdf" && !compact) {
        return (
            <iframe
                className={`gallery-pdf-preview ${className}`}
                src={src}
                title={alt || file.file_name || "PDF attachment"}
            />
        );
    }

    return (
        <div className={`gallery-file-preview ${className}`}>
            <FileTypeIcon mime={file?.mime_type} large={!compact} />
            <strong>{file?.file_name || "Attachment"}</strong>
            {!compact && <span>Use Download to open this file.</span>}
        </div>
    );
}

const permissions = () => {
    try {
        return JSON.parse(localStorage.getItem("permissions") || "{}");
    } catch {
        return {};
    }
};

export default function Gallery() {
    const user = useMemo(getStoredUser, []);
    const isAdmin =
        [true, 1, "1"].includes(user?.is_admin) ||
        [true, 1, "1"].includes(user?.administrator);

    const galleryPermission = permissions().Gallery;

    const canAdd =
        isAdmin || ["Add", "Edit", "Full"].includes(galleryPermission);

    const canDelete =
        isAdmin || ["Edit", "Full"].includes(galleryPermission);

    const canDeleteAll =
        isAdmin || galleryPermission === "Full";

    const [photos, setPhotos] = useState([]);
    const [categories, setCategories] = useState([]);
    const [locations, setLocations] = useState([]);
    const [locationType, setLocationType] = useState("head_office");
    const [storeId, setStoreId] = useState("");
    const [locationFilter, setLocationFilter] = useState("");

    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [locationAccuracy, setLocationAccuracy] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState("");

    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
        total: 0,
        limit: 24
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const [showUpload, setShowUpload] = useState(false);
    const [showBulk, setShowBulk] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [selected, setSelected] = useState(null);

    const [uploading, setUploading] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadPreview, setUploadPreview] = useState("");
    const [uploadCategory, setUploadCategory] = useState("");
    const [uploadDescription, setUploadDescription] = useState("");
    const [uploadError, setUploadError] = useState("");

    const [bulkFiles, setBulkFiles] = useState([]);
    const [bulkUploading, setBulkUploading] = useState(false);
    const [bulkError, setBulkError] = useState("");
    const [bulkCategory, setBulkCategory] = useState("");
    const [bulkDescription, setBulkDescription] = useState("");

    const [qr, setQr] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrError, setQrError] = useState("");
    const [mobileStatus, setMobileStatus] = useState("pending");

    const loadGallery = useCallback(async (requestedPage = 1) => {
        setLoading(true);
        setError("");

        try {
            const params = {
                search,
                category,
                location_type: locationFilter,
                page: requestedPage,
                limit: 24
            };

            if (locationFilter && locationFilter.startsWith("store:")) {
                params.location_type = "store";
                params.store_id = locationFilter.replace("store:", "");
            }

            if (from) params.from = from;
            if (to) params.to = to;

            const response = await axios.get("/api/gallery", { params });

            setPhotos(response.data.photos || []);
            setPagination(
                response.data.pagination || {
                    page: requestedPage,
                    totalPages: 1,
                    total: 0,
                    limit: 24
                }
            );
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                "Unable to load gallery."
            );
        } finally {
            setLoading(false);
        }
    }, [search, category, locationFilter, from, to]);

    const loadLocations = useCallback(async () => {
        try {
            const response = await axios.get("/api/gallery/locations");
            setLocations(response.data.locations || []);
        } catch {
            setLocations([]);
        }
    }, []);

    const loadCategories = useCallback(async () => {
        try {
            const response = await axios.get("/api/gallery/categories");
            setCategories(response.data.categories || []);
        } catch {
            setCategories([]);
        }
    }, []);

    useEffect(() => {
        loadGallery(1);
    }, [loadGallery]);

    useEffect(() => {
        loadCategories();
        loadLocations();
    }, [loadCategories, loadLocations]);

    useEffect(() => {
        if (!uploadFile) {
            setUploadPreview("");
            return undefined;
        }

        const url = URL.createObjectURL(uploadFile);
        setUploadPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [uploadFile]);

    const captureLocation = () => {
        if (!navigator.geolocation) {
            setLocationError(
                "Geolocation is not supported by this browser."
            );
            return;
        }

        setLocationLoading(true);
        setLocationError("");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude);
                setLongitude(position.coords.longitude);
                setLocationAccuracy(
                    Number.isFinite(position.coords.accuracy)
                        ? position.coords.accuracy
                        : null
                );
                setLocationLoading(false);
            },
            (geoError) => {
                const messages = {
                    1: "Location permission was denied. Please allow location access.",
                    2: "Your current location could not be determined.",
                    3: "Location request timed out. Please try again."
                };

                setLocationError(
                    messages[geoError.code] ||
                    "Unable to get your current location."
                );
                setLocationLoading(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000
            }
        );
    };

    const handleLocationChange = (value) => {
        if (value === "head_office") {
            setLocationType("head_office");
            setStoreId("");
            return;
        }

        setLocationType("store");
        setStoreId(value.replace("store:", ""));
    };

    const locationSelectValue =
        locationType === "store" && storeId
            ? `store:${storeId}`
            : "head_office";

    const selectedLocationName =
        locationType === "store"
            ? locations.find(
                item => Number(item.id) === Number(storeId)
            )?.name || "Store"
            : "Head Office";

    const resetLocation = () => {
        setLocationType("head_office");
        setStoreId("");
        setLatitude(null);
        setLongitude(null);
        setLocationAccuracy(null);
        setLocationError("");
    };

    const resetUpload = () => {
        setUploadFile(null);
        setUploadPreview("");
        setUploadCategory("");
        setUploadDescription("");
        setUploadError("");
        resetLocation();
    };

    const submitUpload = async (event) => {
        event.preventDefault();

        if (!uploadFile) {
            setUploadError("Please select a file.");
            return;
        }

        if (locationType === "store" && !storeId) {
            setUploadError("Please select a store.");
            return;
        }

        if (latitude === null || longitude === null) {
            setUploadError(
                "Please capture the current GPS location before uploading."
            );
            return;
        }

        setUploading(true);
        setUploadError("");

        try {
            const formData = new FormData();

            formData.append("photo", uploadFile);
            formData.append("category", uploadCategory);
            formData.append("description", uploadDescription);
            formData.append("location_type", locationType);

            if (storeId) formData.append("store_id", storeId);
            formData.append("latitude", latitude);
            formData.append("longitude", longitude);

            if (locationAccuracy !== null) {
                formData.append(
                    "location_accuracy",
                    locationAccuracy
                );
            }

            await axios.post(
                "/api/gallery/upload",
                formData,
                {
                    headers: {
                        "Content-Type":
                            "multipart/form-data"
                    }
                }
            );

            setShowUpload(false);
            resetUpload();

            await Promise.all([
                loadGallery(1),
                loadCategories()
            ]);
        } catch (err) {
            setUploadError(
                err?.response?.data?.message ||
                "Unable to upload file."
            );
        } finally {
            setUploading(false);
        }
    };

    const handleBulkFiles = (event) => {
        const files = Array.from(event.target.files || []);

        const valid = files.filter(
            file =>
                file.size <= 25 * 1024 * 1024
        );

        if (valid.length !== files.length) {
            setBulkError(
                "Files must be supported media/documents and 25 MB or smaller each."
            );
        } else {
            setBulkError("");
        }

        setBulkFiles(valid.slice(0, 20));
    };

    const submitBulkUpload = async (event) => {
        event.preventDefault();

        if (!bulkFiles.length) {
            setBulkError("Please select at least one file.");
            return;
        }

        if (locationType === "store" && !storeId) {
            setBulkError("Please select a store.");
            return;
        }

        if (latitude === null || longitude === null) {
            setBulkError(
                "Please capture the current GPS location before bulk upload."
            );
            return;
        }

        setBulkUploading(true);
        setBulkError("");

        try {
            const formData = new FormData();

            bulkFiles.forEach(file => {
                formData.append("photos", file);
            });

            formData.append("category", bulkCategory);
            formData.append("description", bulkDescription);
            formData.append("location_type", locationType);
            formData.append("latitude", latitude);
            formData.append("longitude", longitude);

            if (storeId) formData.append("store_id", storeId);

            if (locationAccuracy !== null) {
                formData.append(
                    "location_accuracy",
                    locationAccuracy
                );
            }

            await axios.post(
                "/api/gallery/bulk-upload",
                formData,
                {
                    headers: {
                        "Content-Type":
                            "multipart/form-data"
                    }
                }
            );

            setShowBulk(false);
            setBulkFiles([]);
            setBulkCategory("");
            setBulkDescription("");
            resetLocation();

            await Promise.all([
                loadGallery(1),
                loadCategories()
            ]);
        } catch (err) {
            setBulkError(
                err?.response?.data?.message ||
                "Unable to bulk upload photos."
            );
        } finally {
            setBulkUploading(false);
        }
    };

    const openMobileUpload = () => {
        setQr(null);
        setQrError("");
        setMobileStatus("pending");
        setShowQr(true);
    };

    const createQrSession = async () => {
        if (locationType === "store" && !storeId) {
            setQrError("Please select a store.");
            return;
        }

        setQrLoading(true);
        setQrError("");
        setMobileStatus("pending");

        try {
            const response = await axios.post(
                "/api/gallery/mobile-session",
                {
                    location_type: locationType,
                    store_id: storeId || null
                }
            );

            setQr(response.data);
        } catch (err) {
            setQrError(
                err?.response?.data?.message ||
                "Unable to create mobile upload link."
            );
        } finally {
            setQrLoading(false);
        }
    };

    useEffect(() => {
        if (!showQr || !qr?.sessionId) return undefined;

        let active = true;

        const poll = async () => {
            try {
                const response = await axios.get(
                    `/api/gallery/mobile-session/${qr.sessionId}/status`
                );

                if (!active) return;

                setMobileStatus(response.data.status);

                if (response.data.status === "uploaded") {
                    await Promise.all([
                        loadGallery(1),
                        loadCategories()
                    ]);
                }
            } catch {
                // Session can expire while the modal is open.
            }
        };

        poll();

        const timer = window.setInterval(
            poll,
            2000
        );

        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [
        showQr,
        qr?.sessionId,
        loadGallery,
        loadCategories
    ]);

    const qrImage = qr?.uploadUrl
        ? `https://quickchart.io/qr?size=320&margin=2&text=${encodeURIComponent(
            qr.uploadUrl
        )}`
        : "";

    const clearFilters = () => {
        setSearch("");
        setCategory("");
        setLocationFilter("");
        setFrom("");
        setTo("");
    };

    const deletePhoto = async (photo) => {
        if (
            !window.confirm(
                `Delete "${photo.file_name}" from Gallery?`
            )
        ) {
            return;
        }

        try {
            await axios.delete(
                `/api/gallery/${photo.id}`
            );

            setSelected(null);

            await Promise.all([
                loadGallery(pagination.page),
                loadCategories()
            ]);
        } catch (err) {
            window.alert(
                err?.response?.data?.message ||
                "Unable to delete photo."
            );
        }
    };

    const deleteAll = async () => {
        if (!canDeleteAll) return;

        const confirmed = window.confirm(
            "Delete all Gallery items?\n\nPhotos uploaded by other modules will remain in their original module. Only Gallery-owned files will be physically removed."
        );

        if (!confirmed) return;

        try {
            await axios.delete(
                "/api/gallery/delete-all"
            );

            setSelected(null);

            await Promise.all([
                loadGallery(1),
                loadCategories()
            ]);
        } catch (err) {
            window.alert(
                err?.response?.data?.message ||
                "Unable to clear Gallery."
            );
        }
    };

    const downloadPhoto = async (photo) => {
        try {
            const response = await axios.get(
                `/api/gallery/${photo.id}/download`,
                { responseType: "blob" }
            );

            const url =
                URL.createObjectURL(response.data);

            const anchor =
                document.createElement("a");

            anchor.href = url;
            anchor.download =
                photo.file_name ||
                `miarcus-gallery-${photo.id}`;

            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();

            URL.revokeObjectURL(url);
        } catch (err) {
            window.alert(
                err?.response?.data?.message ||
                "Unable to download photo."
            );
        }
    };

    return (
        <div className="gallery-page">
            <div className="gallery-header">
                <div className="gallery-title-row">
                    <div className="gallery-title-icon">
                        <FaImages />
                    </div>

                    <div>
                        <h1>Gallery</h1>
                        <p>
                            Store and share company photos, videos,
                            documents and attachments in one central place.
                        </p>
                    </div>
                </div>

                <div className="gallery-header-actions">
                    {canAdd && (
                        <>
                            <button
                                className="gallery-btn secondary"
                                onClick={openMobileUpload}
                            >
                                <FaQrcode />
                                Upload from Mobile
                            </button>

                            <button
                                className="gallery-btn secondary"
                                onClick={() => {
                                    setBulkError("");
                                    setShowBulk(true);
                                }}
                            >
                                <FaLayerGroup />
                                Bulk Upload
                            </button>

                            <button
                                className="gallery-btn primary"
                                onClick={() => setShowUpload(true)}
                            >
                                <FaPlus />
                                Add File
                            </button>
                        </>
                    )}

                    {canDeleteAll && (
                        <button
                            className="gallery-btn danger-btn"
                            onClick={deleteAll}
                        >
                            <FaTrash />
                            Delete All
                        </button>
                    )}
                </div>
            </div>

            <div className="gallery-toolbar">
                <div className="gallery-search">
                    <FaSearch />
                    <input
                        value={search}
                        onChange={e =>
                            setSearch(e.target.value)
                        }
                        placeholder="Search photos, employee, category..."
                    />
                </div>

                <div className="gallery-filter">
                    <FaFilter />
                    <select
                        value={category}
                        onChange={e =>
                            setCategory(e.target.value)
                        }
                    >
                        <option value="">
                            All categories
                        </option>

                        {categories.map(item => (
                            <option
                                key={item.category}
                                value={item.category}
                            >
                                {item.category}
                            </option>
                        ))}
                    </select>
                </div>

                <select
                    className="gallery-location-filter"
                    value={locationFilter}
                    onChange={e =>
                        setLocationFilter(e.target.value)
                    }
                >
                    <option value="">
                        All locations
                    </option>

                    <option value="head_office">
                        Head Office
                    </option>

                    {locations
                        .filter(
                            item =>
                                item.location_type === "store"
                        )
                        .map(item => (
                            <option
                                key={item.id}
                                value={`store:${item.id}`}
                            >
                                {item.name}
                            </option>
                        ))}
                </select>

                <input
                    type="date"
                    value={from}
                    onChange={e =>
                        setFrom(e.target.value)
                    }
                    title="From date"
                />

                <input
                    type="date"
                    value={to}
                    onChange={e =>
                        setTo(e.target.value)
                    }
                    title="To date"
                />

                <button
                    className="gallery-clear"
                    onClick={clearFilters}
                    disabled={
                        !search &&
                        !category &&
                        !locationFilter &&
                        !from &&
                        !to
                    }
                >
                    Clear Filters
                </button>
            </div>

            <div className="gallery-meta-row">
                <span>
                    {pagination.total} file
                    {pagination.total === 1 ? "" : "s"}
                </span>

                <span>
                    Gallery files + module attachments
                </span>
            </div>

            {error && (
                <div className="gallery-alert error">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="gallery-grid">
                    {Array.from({ length: 8 }).map(
                        (_, index) => (
                            <div
                                className="gallery-skeleton"
                                key={index}
                            />
                        )
                    )}
                </div>
            ) : photos.length === 0 ? (
                <div className="gallery-empty">
                    <FaImages />

                    <h2>No files found</h2>

                    <p>
                        Upload a file or use the mobile QR
                        uploader. Attachments from supported
                        MIARCUS modules also appear here.
                    </p>

                    {canAdd && (
                        <button
                            className="gallery-btn primary"
                            onClick={() =>
                                setShowUpload(true)
                            }
                        >
                            <FaCloudUploadAlt />
                            Add File
                        </button>
                    )}
                </div>
            ) : (
                <div className="gallery-grid">
                    {photos.map(photo => (
                        <article
                            className="gallery-card"
                            key={photo.id}
                            onClick={() =>
                                setSelected(photo)
                            }
                        >
                            <div className="gallery-image-wrap">
                                <ProtectedGalleryFile
                                    file={photo}
                                    alt={
                                        photo.description ||
                                        photo.file_name
                                    }
                                    compact
                                />

                                <div className="gallery-card-overlay">
                                    <span>
                                        Open file
                                    </span>
                                </div>
                            </div>

                            <div className="gallery-card-body">
                                <div className="gallery-card-topline">
                                    <strong>
                                        {photo.category ||
                                            photo.source_module ||
                                            "General"}
                                    </strong>

                                    <span>
                                        {formatSize(
                                            photo.file_size
                                        )}
                                    </span>
                                </div>

                                <div className="gallery-card-name">
                                    {photo.description ||
                                        photo.file_name}
                                </div>

                                <div className="gallery-card-meta">
                                    {photo.location_name ||
                                        "Head Office"}{" "}
                                    ·{" "}
                                    {photo.uploaded_by_name}{" "}
                                    ·{" "}
                                    {formatDate(
                                        photo.uploaded_at
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {!loading &&
                pagination.totalPages > 1 && (
                    <div className="gallery-pagination">
                        <button
                            disabled={
                                pagination.page <= 1
                            }
                            onClick={() =>
                                loadGallery(
                                    pagination.page - 1
                                )
                            }
                        >
                            <FaChevronLeft />
                        </button>

                        <span>
                            Page {pagination.page} of{" "}
                            {pagination.totalPages}
                        </span>

                        <button
                            disabled={
                                pagination.page >=
                                pagination.totalPages
                            }
                            onClick={() =>
                                loadGallery(
                                    pagination.page + 1
                                )
                            }
                        >
                            <FaChevronRight />
                        </button>
                    </div>
                )}

            {showUpload && (
                <div
                    className="gallery-modal-backdrop"
                    onMouseDown={e =>
                        e.target ===
                        e.currentTarget &&
                        !uploading &&
                        (setShowUpload(false),
                        resetUpload())
                    }
                >
                    <form
                        className="gallery-modal upload-modal"
                        onSubmit={submitUpload}
                    >
                        <div className="gallery-modal-header">
                            <div>
                                <h2>Add File</h2>
                                <p>
                                    Upload an image, video, audio, PDF or common
                                    document up to 25 MB.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setShowUpload(false);
                                    resetUpload();
                                }}
                                disabled={uploading}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <label className="gallery-dropzone">
                            <input
                                type="file"
                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip"
                                onChange={e =>
                                    setUploadFile(
                                        e.target.files?.[0] ||
                                        null
                                    )
                                }
                            />

                            {uploadPreview ? (
                                <img
                                    src={uploadPreview}
                                    alt="Preview"
                                />
                            ) : (
                                <>
                                    <FaCamera />
                                    <strong>
                                        Choose a file
                                    </strong>
                                    <span>
                                        Drag and drop or browse
                                        from your computer
                                    </span>
                                </>
                            )}
                        </label>

                        <div className="gallery-location-panel">
                            <div className="gallery-location-heading">
                                <div>
                                    <FaMapMarkerAlt />
                                    <strong>
                                        Photo Location
                                    </strong>
                                    <span>
                                        Choose the Store or
                                        Head Office and capture
                                        the current GPS.
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className="gallery-location-btn"
                                    onClick={
                                        captureLocation
                                    }
                                    disabled={
                                        locationLoading
                                    }
                                >
                                    <FaLocationArrow />
                                    {locationLoading
                                        ? "Locating..."
                                        : "Use Current Location"}
                                </button>
                            </div>

                            <div className="gallery-form-grid">
                                <label>
                                    Location

                                    <select
                                        value={
                                            locationSelectValue
                                        }
                                        onChange={e =>
                                            handleLocationChange(
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="head_office">
                                            Head Office
                                        </option>

                                        {locations
                                            .filter(
                                                item =>
                                                    item.location_type ===
                                                    "store"
                                            )
                                            .map(item => (
                                                <option
                                                    key={
                                                        item.id
                                                    }
                                                    value={`store:${item.id}`}
                                                >
                                                    {item.name}
                                                    {item.code
                                                        ? ` — ${item.code}`
                                                        : ""}
                                                </option>
                                            ))}
                                    </select>
                                </label>

                                <div className="gallery-location-status">
                                    {latitude !== null &&
                                    longitude !== null ? (
                                        <>
                                            <strong>
                                                GPS captured
                                            </strong>

                                            <span>
                                                {Number(
                                                    latitude
                                                ).toFixed(6)}
                                                ,{" "}
                                                {Number(
                                                    longitude
                                                ).toFixed(6)}
                                                {locationAccuracy
                                                    ? ` · ±${Math.round(
                                                        locationAccuracy
                                                    )} m`
                                                    : ""}
                                            </span>
                                        </>
                                    ) : (
                                        <span>
                                            No GPS coordinates
                                            captured yet.
                                        </span>
                                    )}
                                </div>
                            </div>

                            {locationError && (
                                <div className="gallery-location-error">
                                    {locationError}
                                </div>
                            )}
                        </div>

                        <div className="gallery-form-grid">
                            <label>
                                Category
                                <input
                                    value={
                                        uploadCategory
                                    }
                                    onChange={e =>
                                        setUploadCategory(
                                            e.target.value
                                        )
                                    }
                                    maxLength={100}
                                    placeholder="e.g. Store Visit"
                                />
                            </label>

                            <label>
                                Description
                                <textarea
                                    value={
                                        uploadDescription
                                    }
                                    onChange={e =>
                                        setUploadDescription(
                                            e.target.value
                                        )
                                    }
                                    maxLength={2000}
                                    placeholder="Add a short description"
                                />
                            </label>
                        </div>

                        {uploadError && (
                            <div className="gallery-alert error">
                                {uploadError}
                            </div>
                        )}

                        <div className="gallery-modal-footer">
                            <button
                                type="button"
                                className="gallery-btn secondary"
                                onClick={() => {
                                    setShowUpload(false);
                                    resetUpload();
                                }}
                                disabled={uploading}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="gallery-btn primary"
                                disabled={
                                    uploading ||
                                    !uploadFile
                                }
                            >
                                <FaCloudUploadAlt />
                                {uploading
                                    ? "Uploading..."
                                    : "Upload File"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showBulk && (
                <div
                    className="gallery-modal-backdrop"
                    onMouseDown={e =>
                        e.target ===
                        e.currentTarget &&
                        !bulkUploading &&
                        setShowBulk(false)
                    }
                >
                    <form
                        className="gallery-modal upload-modal"
                        onSubmit={submitBulkUpload}
                    >
                        <div className="gallery-modal-header">
                            <div>
                                <h2>Bulk Upload Files</h2>
                                <p>
                                    Select up to 20 supported files, 25 MB each.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowBulk(false)
                                }
                                disabled={bulkUploading}
                            >
                                <FaTimes />
                            </button>
                        </div>

                        <label className="gallery-bulk-dropzone">
                            <input
                                type="file"
                                multiple
                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip"
                                onChange={handleBulkFiles}
                            />

                            <FaLayerGroup />

                            <strong>
                                Choose multiple files
                            </strong>

                            <span>
                                {bulkFiles.length
                                    ? `${bulkFiles.length} file${bulkFiles.length === 1 ? "" : "s"} selected`
                                    : "Select up to 20 files"}
                            </span>
                        </label>

                        <div className="gallery-bulk-file-list">
                            {bulkFiles.map(
                                (file, index) => (
                                    <div
                                        key={`${file.name}-${index}`}
                                    >
                                        <span>
                                            {file.name}
                                        </span>
                                        <small>
                                            {formatSize(
                                                file.size
                                            )}
                                        </small>
                                    </div>
                                )
                            )}
                        </div>

                        <div className="gallery-location-panel">
                            <div className="gallery-location-heading">
                                <div>
                                    <FaMapMarkerAlt />
                                    <strong>
                                        Upload Location
                                    </strong>
                                    <span>
                                        All selected photos
                                        use this location and
                                        current GPS.
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className="gallery-location-btn"
                                    onClick={
                                        captureLocation
                                    }
                                    disabled={
                                        locationLoading
                                    }
                                >
                                    <FaLocationArrow />
                                    {locationLoading
                                        ? "Locating..."
                                        : "Use Current Location"}
                                </button>
                            </div>

                            <div className="gallery-form-grid">
                                <label>
                                    Location

                                    <select
                                        value={
                                            locationSelectValue
                                        }
                                        onChange={e =>
                                            handleLocationChange(
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="head_office">
                                            Head Office
                                        </option>

                                        {locations
                                            .filter(
                                                item =>
                                                    item.location_type ===
                                                    "store"
                                            )
                                            .map(item => (
                                                <option
                                                    key={
                                                        item.id
                                                    }
                                                    value={`store:${item.id}`}
                                                >
                                                    {item.name}
                                                    {item.code
                                                        ? ` — ${item.code}`
                                                        : ""}
                                                </option>
                                            ))}
                                    </select>
                                </label>

                                <div className="gallery-location-status">
                                    {latitude !== null &&
                                    longitude !== null ? (
                                        <>
                                            <strong>
                                                GPS captured
                                            </strong>
                                            <span>
                                                {Number(
                                                    latitude
                                                ).toFixed(6)}
                                                ,{" "}
                                                {Number(
                                                    longitude
                                                ).toFixed(6)}
                                            </span>
                                        </>
                                    ) : (
                                        <span>
                                            No GPS coordinates
                                            captured yet.
                                        </span>
                                    )}
                                </div>
                            </div>

                            {locationError && (
                                <div className="gallery-location-error">
                                    {locationError}
                                </div>
                            )}
                        </div>

                        <div className="gallery-form-grid">
                            <label>
                                Category
                                <input
                                    value={
                                        bulkCategory
                                    }
                                    onChange={e =>
                                        setBulkCategory(
                                            e.target.value
                                        )
                                    }
                                    maxLength={100}
                                    placeholder="Optional"
                                />
                            </label>

                            <label>
                                Description
                                <textarea
                                    value={
                                        bulkDescription
                                    }
                                    onChange={e =>
                                        setBulkDescription(
                                            e.target.value
                                        )
                                    }
                                    maxLength={2000}
                                    placeholder="Optional"
                                />
                            </label>
                        </div>

                        {bulkError && (
                            <div className="gallery-alert error">
                                {bulkError}
                            </div>
                        )}

                        <div className="gallery-modal-footer">
                            <button
                                type="button"
                                className="gallery-btn secondary"
                                onClick={() =>
                                    setShowBulk(false)
                                }
                                disabled={bulkUploading}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="gallery-btn primary"
                                disabled={
                                    bulkUploading ||
                                    !bulkFiles.length
                                }
                            >
                                <FaCloudUploadAlt />
                                {bulkUploading
                                    ? "Uploading..."
                                    : `Upload ${bulkFiles.length || ""} Files`}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showQr && (
                <div
                    className="gallery-modal-backdrop"
                    onMouseDown={e =>
                        e.target ===
                        e.currentTarget &&
                        setShowQr(false)
                    }
                >
                    <div className="gallery-modal qr-modal">
                        <div className="gallery-modal-header">
                            <div>
                                <h2>
                                    <FaMobileAlt />
                                    Upload from phone
                                </h2>
                                <p>
                                    Select a location, then
                                    generate a secure QR link.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowQr(false)
                                }
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {!qr ? (
                            <div className="gallery-qr-setup">
                                <div className="gallery-location-panel">
                                    <div className="gallery-location-heading">
                                        <div>
                                            <FaMapMarkerAlt />
                                            <strong>
                                                Mobile Upload
                                                Location
                                            </strong>
                                            <span>
                                                The phone will
                                                capture the
                                                actual GPS when
                                                the photo is
                                                uploaded.
                                            </span>
                                        </div>
                                    </div>

                                    <label className="gallery-location-select-label">
                                        Location

                                        <select
                                            value={
                                                locationSelectValue
                                            }
                                            onChange={e =>
                                                handleLocationChange(
                                                    e.target.value
                                                )
                                            }
                                        >
                                            <option value="head_office">
                                                Head Office
                                            </option>

                                            {locations
                                                .filter(
                                                    item =>
                                                        item.location_type ===
                                                        "store"
                                                )
                                                .map(item => (
                                                    <option
                                                        key={
                                                            item.id
                                                        }
                                                        value={`store:${item.id}`}
                                                    >
                                                        {item.name}
                                                        {item.code
                                                            ? ` — ${item.code}`
                                                            : ""}
                                                    </option>
                                                ))}
                                        </select>
                                    </label>
                                </div>

                                {qrError && (
                                    <div className="gallery-alert error">
                                        {qrError}
                                    </div>
                                )}

                                <div className="gallery-modal-footer">
                                    <button
                                        className="gallery-btn secondary"
                                        onClick={() =>
                                            setShowQr(false)
                                        }
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        className="gallery-btn primary"
                                        onClick={
                                            createQrSession
                                        }
                                        disabled={
                                            qrLoading ||
                                            (locationType ===
                                                "store" &&
                                                !storeId)
                                        }
                                    >
                                        <FaQrcode />
                                        {qrLoading
                                            ? "Creating..."
                                            : "Generate QR Code"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="qr-layout">
                                    <div className="qr-image-box">
                                        <img
                                            src={qrImage}
                                            alt="Miarcus mobile upload QR code"
                                        />
                                    </div>

                                    <div className="qr-info">
                                        <div
                                            className={`qr-status ${mobileStatus}`}
                                        >
                                            <span />
                                            {mobileStatus ===
                                            "pending"
                                                ? "Waiting for mobile upload"
                                                : mobileStatus ===
                                                    "uploaded"
                                                    ? "Photo uploaded successfully"
                                                    : "Upload link expired"}
                                        </div>

                                        <p>
                                            <strong>
                                                {selectedLocationName}
                                            </strong>{" "}
                                            · Scan the QR code
                                            with the phone camera.
                                            The phone captures the
                                            actual GPS location.
                                        </p>

                                        <p>
                                            This secure link is
                                            single-use and expires
                                            in 10 minutes.
                                        </p>

                                        <a
                                            href={
                                                qr.uploadUrl
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Open mobile upload
                                        </a>
                                    </div>
                                </div>

                                <div className="gallery-modal-footer">
                                    <button
                                        className="gallery-btn primary"
                                        onClick={() =>
                                            setShowQr(false)
                                        }
                                    >
                                        Done
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {selected && (
                <div
                    className="gallery-lightbox"
                    onMouseDown={e =>
                        e.target ===
                        e.currentTarget &&
                        setSelected(null)
                    }
                >
                    <div className="gallery-lightbox-content">
                        <button
                            className="lightbox-close"
                            onClick={() =>
                                setSelected(null)
                            }
                        >
                            <FaTimes />
                        </button>

                        <ProtectedGalleryFile
                            file={selected}
                            alt={
                                selected.description ||
                                selected.file_name
                            }
                        />

                        <div className="lightbox-details">
                            <div>
                                <span className="lightbox-category">
                                    {selected.source_module ||
                                        "Gallery"}
                                </span>

                                <h2>
                                    {selected.description ||
                                        selected.file_name}
                                </h2>

                                <p>
                                    Uploaded by{" "}
                                    <strong>
                                        {
                                            selected.uploaded_by_name
                                        }
                                    </strong>

                                    {selected.employee_id
                                        ? ` (${selected.employee_id})`
                                        : ""}{" "}
                                    ·{" "}
                                    {formatDate(
                                        selected.uploaded_at
                                    )}
                                </p>

                                <p className="lightbox-location">
                                    <FaMapMarkerAlt />
                                    <strong>
                                        {
                                            selected.location_name
                                        }
                                    </strong>

                                    {selected.latitude !==
                                        null &&
                                    selected.longitude !==
                                        null
                                        ? ` · ${Number(
                                            selected.latitude
                                        ).toFixed(
                                            6
                                        )}, ${Number(
                                            selected.longitude
                                        ).toFixed(6)}`
                                        : " · GPS not captured"}
                                </p>
                            </div>

                            <div className="lightbox-actions">
                                <button
                                    onClick={() =>
                                        downloadPhoto(
                                            selected
                                        )
                                    }
                                >
                                    <FaDownload />
                                    Download
                                </button>

                                {canDelete &&
                                    (isAdmin ||
                                        Number(
                                            selected.uploaded_by
                                        ) ===
                                        Number(
                                            user?.id ||
                                            user?.user_id
                                        )) && (
                                        <button
                                            className="danger"
                                            onClick={() =>
                                                deletePhoto(
                                                    selected
                                                )
                                            }
                                        >
                                            <FaTrash />
                                            Delete
                                        </button>
                                    )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
