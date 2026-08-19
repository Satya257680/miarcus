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
    FaChevronRight
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "../styles/Gallery.css";

const getApi = () => String(axios.defaults.baseURL || "").replace(/\/$/, "");

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

const imageUrl = (filePath) => {
    if (!filePath) return "";
    if (/^https?:\/\//i.test(filePath)) return filePath;
    return `${getApi()}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
};

export default function Gallery() {
    const navigate = useNavigate();
    const user = useMemo(getStoredUser, []);
    const isAdmin = [true, 1, "1"].includes(user?.is_admin) || [true, 1, "1"].includes(user?.administrator);

    const [photos, setPhotos] = useState([]);
    const [categories, setCategories] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 24 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const [showUpload, setShowUpload] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const [selected, setSelected] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadPreview, setUploadPreview] = useState("");
    const [uploadCategory, setUploadCategory] = useState("");
    const [uploadDescription, setUploadDescription] = useState("");
    const [uploadError, setUploadError] = useState("");

    const [qr, setQr] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrError, setQrError] = useState("");
    const [mobileStatus, setMobileStatus] = useState("pending");

    const canAdd = isAdmin || ["Add", "Edit", "Full"].includes(
        (() => {
            try { return JSON.parse(localStorage.getItem("permissions") || "{}").Gallery; } catch { return "None"; }
        })()
    );
    const canDelete = isAdmin || ["Edit", "Full"].includes(
        (() => {
            try { return JSON.parse(localStorage.getItem("permissions") || "{}").Gallery; } catch { return "None"; }
        })()
    );

    const loadGallery = useCallback(async (requestedPage = pagination.page) => {
        setLoading(true);
        setError("");
        try {
            const response = await axios.get("/api/gallery", {
                params: { search, category, from, to, page: requestedPage, limit: 24 }
            });
            setPhotos(response.data.photos || []);
            setPagination(response.data.pagination || { page: requestedPage, totalPages: 1, total: 0, limit: 24 });
        } catch (err) {
            setError(err?.response?.data?.message || "Unable to load gallery.");
        } finally {
            setLoading(false);
        }
    }, [search, category, from, to, pagination.page]);

    const loadCategories = useCallback(async () => {
        try {
            const response = await axios.get("/api/gallery/categories");
            setCategories(response.data.categories || []);
        } catch {
            // Category filter is optional; gallery itself remains usable.
        }
    }, []);

    useEffect(() => {
        loadGallery(1);
    }, [search, category, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        if (!uploadFile) {
            setUploadPreview("");
            return undefined;
        }
        const url = URL.createObjectURL(uploadFile);
        setUploadPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [uploadFile]);

    const resetUpload = () => {
        setUploadFile(null);
        setUploadPreview("");
        setUploadCategory("");
        setUploadDescription("");
        setUploadError("");
    };

    const submitUpload = async (event) => {
        event.preventDefault();
        if (!uploadFile) {
            setUploadError("Please select an image.");
            return;
        }
        setUploading(true);
        setUploadError("");
        try {
            const formData = new FormData();
            formData.append("photo", uploadFile);
            formData.append("category", uploadCategory);
            formData.append("description", uploadDescription);
            await axios.post("/api/gallery/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setShowUpload(false);
            resetUpload();
            await Promise.all([loadGallery(1), loadCategories()]);
        } catch (err) {
            setUploadError(err?.response?.data?.message || "Unable to upload photo.");
        } finally {
            setUploading(false);
        }
    };

    const createQrSession = async () => {
        setQrLoading(true);
        setQrError("");
        setMobileStatus("pending");
        try {
            const response = await axios.post("/api/gallery/mobile-session");
            setQr(response.data);
            setShowQr(true);
        } catch (err) {
            setQrError(err?.response?.data?.message || "Unable to create mobile upload link.");
        } finally {
            setQrLoading(false);
        }
    };

    useEffect(() => {
        if (!showQr || !qr?.sessionId) return undefined;
        let active = true;
        const poll = async () => {
            try {
                const response = await axios.get(`/api/gallery/mobile-session/${qr.sessionId}/status`);
                if (!active) return;
                setMobileStatus(response.data.status);
                if (response.data.status === "uploaded") {
                    await loadGallery(1);
                    await loadCategories();
                }
            } catch {
                // The session can expire while the modal is open.
            }
        };
        poll();
        const timer = window.setInterval(poll, 2000);
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [showQr, qr?.sessionId, loadGallery, loadCategories]);

    const qrImage = qr?.uploadUrl
        ? `https://quickchart.io/qr?size=320&margin=2&text=${encodeURIComponent(qr.uploadUrl)}`
        : "";

    const deletePhoto = async (photo) => {
        if (!window.confirm(`Delete "${photo.file_name}" from Gallery?`)) return;
        try {
            await axios.delete(`/api/gallery/${photo.id}`);
            setSelected(null);
            await loadGallery(pagination.page);
            await loadCategories();
        } catch (err) {
            window.alert(err?.response?.data?.message || "Unable to delete photo.");
        }
    };

    const downloadPhoto = async (photo) => {
        try {
            const response = await axios.get(`/api/gallery/${photo.id}/download`, { responseType: "blob" });
            const url = URL.createObjectURL(response.data);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = photo.file_name || `miarcus-gallery-${photo.id}`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            window.alert(err?.response?.data?.message || "Unable to download photo.");
        }
    };

    return (
        <div className="gallery-page">
            <div className="gallery-header">
                <div>
                    <div className="gallery-title-row">
                        <div className="gallery-title-icon"><FaImages /></div>
                        <div>
                            <h1>Gallery</h1>
                            <p>Store and share company photos in one central place.</p>
                        </div>
                    </div>
                </div>

                <div className="gallery-header-actions">
                    {canAdd && (
                        <>
                            <button className="gallery-btn secondary" onClick={createQrSession} disabled={qrLoading}>
                                <FaQrcode /> {qrLoading ? "Creating..." : "Upload from Mobile"}
                            </button>
                            <button className="gallery-btn primary" onClick={() => setShowUpload(true)}>
                                <FaPlus /> Add Photo
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="gallery-toolbar">
                <div className="gallery-search">
                    <FaSearch />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search photos, employee, category..." />
                </div>
                <div className="gallery-filter">
                    <FaFilter />
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">All categories</option>
                        {categories.map(item => <option key={item.category} value={item.category}>{item.category}</option>)}
                    </select>
                </div>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
                {(search || category || from || to) && (
                    <button className="gallery-clear" onClick={() => { setSearch(""); setCategory(""); setFrom(""); setTo(""); }}>Clear</button>
                )}
            </div>

            <div className="gallery-meta-row">
                <span>{pagination.total} photo{pagination.total === 1 ? "" : "s"}</span>
                <span>Desktop upload + QR mobile camera</span>
            </div>

            {error && <div className="gallery-alert error">{error}</div>}

            {loading ? (
                <div className="gallery-grid">
                    {Array.from({ length: 8 }).map((_, index) => <div className="gallery-skeleton" key={index} />)}
                </div>
            ) : photos.length === 0 ? (
                <div className="gallery-empty">
                    <FaImages />
                    <h2>No photos yet</h2>
                    <p>Upload a photo from your computer or use your phone camera through the QR option.</p>
                    {canAdd && <button className="gallery-btn primary" onClick={() => setShowUpload(true)}><FaCloudUploadAlt /> Add the first photo</button>}
                </div>
            ) : (
                <div className="gallery-grid">
                    {photos.map(photo => (
                        <article className="gallery-card" key={photo.id} onClick={() => setSelected(photo)}>
                            <div className="gallery-image-wrap">
                                <img src={imageUrl(photo.file_path)} alt={photo.description || photo.file_name} loading="lazy" />
                                <div className="gallery-card-overlay"><span>Open photo</span></div>
                            </div>
                            <div className="gallery-card-body">
                                <div className="gallery-card-topline">
                                    <strong>{photo.category || "General"}</strong>
                                    <span>{formatSize(photo.file_size)}</span>
                                </div>
                                <div className="gallery-card-name">{photo.description || photo.file_name}</div>
                                <div className="gallery-card-meta">{photo.uploaded_by_name} · {formatDate(photo.uploaded_at)}</div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {!loading && pagination.totalPages > 1 && (
                <div className="gallery-pagination">
                    <button disabled={pagination.page <= 1} onClick={() => loadGallery(pagination.page - 1)}><FaChevronLeft /></button>
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                    <button disabled={pagination.page >= pagination.totalPages} onClick={() => loadGallery(pagination.page + 1)}><FaChevronRight /></button>
                </div>
            )}

            {showUpload && (
                <div className="gallery-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !uploading && (setShowUpload(false), resetUpload())}>
                    <form className="gallery-modal upload-modal" onSubmit={submitUpload}>
                        <div className="gallery-modal-header">
                            <div><h2>Add Photo</h2><p>Upload a JPG, PNG or WEBP image up to 15 MB.</p></div>
                            <button type="button" onClick={() => { setShowUpload(false); resetUpload(); }} disabled={uploading}><FaTimes /></button>
                        </div>

                        <label className="gallery-dropzone">
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                            {uploadPreview ? <img src={uploadPreview} alt="Preview" /> : <><FaCamera /><strong>Choose a photo</strong><span>Drag and drop or browse from your computer</span></>}
                        </label>

                        <div className="gallery-form-grid">
                            <label>Category<input value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} maxLength={100} placeholder="e.g. Store Visit" /></label>
                            <label>Description<textarea value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} maxLength={2000} placeholder="Add a short description" /></label>
                        </div>
                        {uploadError && <div className="gallery-alert error">{uploadError}</div>}
                        <div className="gallery-modal-footer">
                            <button type="button" className="gallery-btn secondary" onClick={() => { setShowUpload(false); resetUpload(); }} disabled={uploading}>Cancel</button>
                            <button type="submit" className="gallery-btn primary" disabled={uploading || !uploadFile}><FaCloudUploadAlt /> {uploading ? "Uploading..." : "Upload Photo"}</button>
                        </div>
                    </form>
                </div>
            )}

            {showQr && qr && (
                <div className="gallery-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowQr(false)}>
                    <div className="gallery-modal qr-modal">
                        <div className="gallery-modal-header">
                            <div><h2><FaMobileAlt /> Upload from phone</h2><p>Scan this QR code with your phone camera.</p></div>
                            <button type="button" onClick={() => setShowQr(false)}><FaTimes /></button>
                        </div>
                        <div className="qr-layout">
                            <div className="qr-image-box"><img src={qrImage} alt="Miarcus mobile upload QR code" /></div>
                            <div className="qr-info">
                                <div className={`qr-status ${mobileStatus}`}><span />{mobileStatus === "pending" ? "Waiting for mobile upload" : mobileStatus === "uploaded" ? "Photo uploaded successfully" : "Upload link expired"}</div>
                                <p>On the phone, Miarcus will offer <strong>Take Photo</strong> or <strong>Choose Photo</strong>. The link is single-use and expires in 10 minutes.</p>
                                <a href={qr.uploadUrl} target="_blank" rel="noreferrer">Open mobile upload page</a>
                            </div>
                        </div>
                        <div className="gallery-modal-footer"><button className="gallery-btn primary" onClick={() => setShowQr(false)}>Done</button></div>
                    </div>
                </div>
            )}

            {selected && (
                <div className="gallery-lightbox" onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}>
                    <div className="gallery-lightbox-content">
                        <button className="lightbox-close" onClick={() => setSelected(null)}><FaTimes /></button>
                        <img src={imageUrl(selected.file_path)} alt={selected.description || selected.file_name} />
                        <div className="lightbox-details">
                            <div><span className="lightbox-category">{selected.category || "General"}</span><h2>{selected.description || selected.file_name}</h2><p>Uploaded by <strong>{selected.uploaded_by_name}</strong>{selected.employee_id ? ` (${selected.employee_id})` : ""} · {formatDate(selected.uploaded_at)}</p></div>
                            <div className="lightbox-actions">
                                <button onClick={() => downloadPhoto(selected)}><FaDownload /> Download</button>
                                {canDelete && (isAdmin || Number(selected.uploaded_by) === Number(user?.id || user?.user_id)) && <button className="danger" onClick={() => deletePhoto(selected)}><FaTrash /> Delete</button>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
