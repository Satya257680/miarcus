import PremiumLoader from "../../premium/PremiumLoader";
import { useState, useEffect, useRef } from "react";
import {
    FaCloudUploadAlt,
    FaFileExcel,
    FaFileCsv,
    FaFilePdf,
    FaFileImage,
    FaFileVideo,
    FaUpload,
    FaDownload,
    FaTimes,
    FaCheckCircle,
    FaExclamationTriangle
} from "react-icons/fa";

import axios from "../../../axiosConfig.js";
import "../../../styles/common/BulkUploadModal.css";

// ======================================================
// CHUNKED ("LARGE FILE") UPLOAD
// ======================================================
//
// IIS's own request-size ceiling in front of this app tops out at
// ~4 GB per request (see server/web.config) — that is a hard limit of
// IIS itself, not something any client-side change can get around.
// To support files up to the app's configured 100 GB ceiling, a file
// bigger than `chunkThreshold` is instead sliced into `chunkSize`
// pieces and sent to server/routes/uploadRoutes.js
// (server/middleware/chunkedUpload.js), which reassembles them on the
// server before handing the result to the exact same bulk-upload
// controller a normal upload already used.
//
// This only activates when a page passes `enableChunkedUpload` — see
// pages/ChecklistReports.jsx and pages/ActionPoints.jsx for the two
// pages currently wired up end-to-end (their upload handlers accept
// an optional second `assembledFile` argument; see those files for
// the pattern to follow when adding this to another bulk-upload
// page).
// ======================================================

const CHUNK_UPLOAD_BASE = "/api/uploads";

function formatFileSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
}

function authHeaders() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function uploadFileInChunks(file, chunkSize, onProgress) {

    const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

    const initResponse = await axios.post(
        `${CHUNK_UPLOAD_BASE}/init`,
        {
            originalName: file.name,
            mimetype: file.type || "application/octet-stream",
            totalSize: file.size,
            totalChunks
        },
        { headers: authHeaders() }
    );

    const uploadId = initResponse?.data?.uploadId;

    if (!uploadId) {
        throw new Error("Could not start the large-file upload session.");
    }

    try {

        for (let index = 0; index < totalChunks; index += 1) {

            const start = index * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const blob = file.slice(start, end);

            const formData = new FormData();
            formData.append("chunk", blob, `chunk-${index}`);

            await axios.post(
                `${CHUNK_UPLOAD_BASE}/${uploadId}/chunk/${index}`,
                formData,
                { headers: authHeaders() }
            );

            if (onProgress) {
                onProgress(Math.round(((index + 1) / totalChunks) * 100));
            }

        }

        const completeResponse = await axios.post(
            `${CHUNK_UPLOAD_BASE}/${uploadId}/complete`,
            {},
            { headers: authHeaders() }
        );

        const assembledFile = completeResponse?.data?.file?.token;

        if (!assembledFile) {
            throw new Error("The server did not confirm the large file was received.");
        }

        return assembledFile;

    } catch (error) {

        // Best-effort cleanup of the abandoned session — never let a
        // cleanup failure hide the real error from the caller.
        axios
            .delete(`${CHUNK_UPLOAD_BASE}/${uploadId}`, { headers: authHeaders() })
            .catch(() => {});

        throw error;

    }

}


async function waitForBulkJob(jobResponse, onProgress) {
    if (!jobResponse?.processing || !jobResponse?.statusUrl) {
        return jobResponse;
    }

    const statusUrl = jobResponse.statusUrl;
    const started = Date.now();
    const MAX_WAIT_MS = 24 * 60 * 60 * 1000; // large imports may legitimately take hours

    while (Date.now() - started < MAX_WAIT_MS) {
        const response = await axios.get(statusUrl, {
            headers: authHeaders(),
            params: { _: Date.now() }
        });

        const job = response?.data?.job;

        if (!job) {
            throw new Error("The server returned an invalid bulk-upload status.");
        }

        if (onProgress) {
            onProgress(job);
        }

        if (job.status === "completed" || job.status === "failed") {
            return {
                success: Boolean(job.success),
                message: job.message,
                errors: job.errors || [],
                warnings: job.warnings || [],
                data: {
                    created: job.created || 0,
                    movedToReports: job.movedToReports || 0,
                    errors: job.errors || [],
                    warnings: job.warnings || []
                }
            };
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error("The import is taking longer than expected. Please keep the MI ARCUS window open and check the upload status again.");
}

function BulkUploadModal({

    isOpen,

    onClose,

    onSuccess,

    uploadFunction,

    title = "Bulk Upload",

    // Every bulk upload across the app now accepts CSV, Excel, PDF, a
    // photo of a printed/handwritten list, or a video (attached rather
    // than parsed into rows — see server/utils/bulkFileParser.js) unless
    // a page explicitly narrows this down.
    acceptedFile = ".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp,.mp4,.mov,.avi,.mkv,.webm",

    sampleFile = null,

    // Matches the app-wide server-side ceiling — see MAX_UPLOAD_SIZE in
    // server/middleware/fileSecurity.js. A single request still can't
    // exceed IIS's own ~4 GB ceiling (server/web.config) unless
    // `enableChunkedUpload` is also turned on for this page.
    maxFileSize = 100 * 1024 * 1024 * 1024, // 100 GB

    // Opt-in: switches a file larger than `chunkThreshold` to the
    // chunked upload flow (see uploadFileInChunks above) instead of a
    // single request. Only turn this on for a page whose upload
    // handler (the `uploadFunction` prop) also knows how to send the
    // resulting { assembledFile } token — see pages/ChecklistReports.jsx
    // and pages/ActionPoints.jsx for the pattern.
    enableChunkedUpload = false,

    // Use chunked upload for files above 20 MB. This keeps large
    // Action Point / Checklist Report uploads well below the IIS
    // single-request limit and avoids 502s caused by large multipart
    // requests. Each chunk is 10 MB.
    chunkThreshold = 20 * 1024 * 1024, // 20 MB
    chunkSize = 10 * 1024 * 1024 // 10 MB per chunk

}) {

    // ======================================================
    // STATES
    // ======================================================

    const [file, setFile] = useState(null);

    const [loading, setLoading] = useState(false);

    const [dragging, setDragging] = useState(false);

    // Only used while the chunked upload flow is actively transferring
    // a large file — see enableChunkedUpload above.
    const [uploadProgress, setUploadProgress] = useState(null);

    const [jobProgress, setJobProgress] = useState(null);

    // Holds the last upload response so partial results (some rows
    // created, some skipped with a reason) can be shown inline instead of
    // a single opaque alert() that hides the per-row detail.
    const [result, setResult] = useState(null);

    const inputRef = useRef(null);

    // ======================================================
    // RESET
    // ======================================================

    useEffect(() => {

        if (!isOpen) {

            setFile(null);

            setLoading(false);

            setDragging(false);

            setResult(null);

            setUploadProgress(null);

            setJobProgress(null);

        }

    }, [isOpen]);

    if (!isOpen) return null;

    // ======================================================
    // VALIDATE FILE
    // ======================================================
    //
    // The allowed extensions come from the `acceptedFile` prop
    // (e.g. ".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp") rather
    // than a hardcoded list, so every page using this modal can
    // opt into the wider "any format" bulk upload just by
    // passing a broader `acceptedFile` string — the page's own
    // backend route ultimately decides what it actually accepts.
    // ======================================================

    const allowedExtensions = acceptedFile

        .split(",")

        .map((ext) => ext.trim().replace(/^\./, "").toLowerCase())

        .filter(Boolean);

    const validateFile = (selectedFile) => {

        if (!selectedFile) return false;

        const extension = selectedFile.name

            .split(".")

            .pop()

            .toLowerCase();

        if (!allowedExtensions.includes(extension)) {

            alert(

                `Only ${allowedExtensions.join(", ").toUpperCase()} files are allowed.`

            );

            return false;

        }

        if (selectedFile.size > maxFileSize) {

            const isGigabyteScale = maxFileSize >= 1024 * 1024 * 1024;

            const readableLimit = isGigabyteScale
                ? `${(maxFileSize / (1024 * 1024 * 1024)).toFixed(1)} GB`
                : `${Math.round(maxFileSize / (1024 * 1024))} MB`;

            alert(

                `Maximum file size is ${readableLimit}.`

            );

            return false;

        }

        return true;

    };

    // ======================================================
    // FILE CHANGE
    // ======================================================

    const handleFileChange = (e) => {

        const selected = e.target.files[0];

        if (!validateFile(selected)) {

            e.target.value = "";

            return;

        }

        setFile(selected);

    };

    // ======================================================
    // DROP
    // ======================================================

    const handleDrop = (e) => {

        e.preventDefault();

        setDragging(false);

        const dropped = e.dataTransfer.files[0];

        if (!validateFile(dropped)) return;

        setFile(dropped);

    };

    const handleDragOver = (e) => {

        e.preventDefault();

        setDragging(true);

    };

    const handleDragLeave = () => {

        setDragging(false);

    };
        // ======================================================
    // UPLOAD
    // ======================================================

    const handleUpload = async () => {

        if (!file) {

            alert("Please select a file.");

            return;

        }

        setResult(null);

        try {

            setLoading(true);

            let response;

            // Large-file path: slice the file into pieces, upload each
            // one, then hand the caller's uploadFunction the resulting
            // server-side token instead of the (already fully
            // transferred) File itself. See uploadFileInChunks above.
            if (enableChunkedUpload && file.size > chunkThreshold) {

                setUploadProgress(0);

                const assembledFile = await uploadFileInChunks(
                    file,
                    chunkSize,
                    (percent) => setUploadProgress(percent)
                );

                setUploadProgress(null);

                response = await uploadFunction(file, { assembledFile });

                response = await waitForBulkJob(
                    response,
                    (job) => setJobProgress(job)
                );

            } else {

                // Pass File only.
                // Each page creates its own FormData.

                response = await uploadFunction(file);

                response = await waitForBulkJob(
                    response,
                    (job) => setJobProgress(job)
                );

            }

            // Collect the row-by-row detail wherever the caller's API put
            // it, so "why didn't this row import?" is always answerable
            // from the modal instead of a vague popup.
            setJobProgress(null);

            const errors = response?.errors || response?.data?.errors || [];
            const warnings = response?.warnings || response?.data?.warnings || [];
            const hasDetail = errors.length > 0 || warnings.length > 0;

            setResult({
                success: Boolean(response?.success),
                message:
                    response?.message ||
                    (response?.success
                        ? "Bulk upload completed successfully."
                        : "Upload failed."),
                errors,
                warnings
            });

            if (response?.success) {

                setFile(null);

                if (inputRef.current) inputRef.current.value = "";

                if (onSuccess) {

                    await onSuccess();

                }

                // Only auto-close when everything imported cleanly. When
                // some rows were skipped, keep the modal open so the
                // problem rows stay visible instead of vanishing the
                // moment the alert would otherwise have been dismissed.
                if (!hasDetail) {
                    onClose();
                }

            }

        } catch (err) {

            console.error(err);

            setResult({
                success: false,
                message:
                    err.response?.data?.message ||
                    err.message ||
                    "Upload failed.",
                errors: err.response?.data?.errors || err.response?.data?.data?.errors || [],
                warnings: err.response?.data?.warnings || err.response?.data?.data?.warnings || []
            });

        } finally {

            setLoading(false);

            setUploadProgress(null);

        }

    };

    // ======================================================
    // REMOVE FILE
    // ======================================================

    const removeFile = () => {

        setFile(null);

        setResult(null);

        if (inputRef.current) {

            inputRef.current.value = "";

        }

    };

    // ======================================================
    // RETURN
    // ======================================================

    return (

        <div className="bulk-modal-overlay">

            <div className="bulk-modal">

                {/* =====================================
                    PROCESSING OVERLAY

                    Large files (thousands of rows) can take a
                    while to validate/import on the server. The
                    "Uploading..." button label alone is easy to
                    miss, which makes the modal look frozen/stuck.
                    This overlay makes it unmistakable, on every
                    page that uses this shared component, that the
                    file is actively being read and processed.
                ===================================== */}

                {loading && (

                    <PremiumLoader
                        overlay
                        title={uploadProgress !== null
                            ? "Uploading Your File..."
                            : jobProgress
                                ? "Importing Your Data..."
                                : "Preparing Your Import..."}
                        message={uploadProgress !== null
                            ? "Your file is being transferred in protected 10 MB pieces."
                            : jobProgress?.message || "Validating, matching and saving your records safely. This may take a few moments."}
                        progress={uploadProgress !== null
                            ? uploadProgress
                            : jobProgress
                                ? Number(jobProgress.percent || 0)
                                : undefined}
                        processed={jobProgress ? jobProgress.processed : undefined}
                        total={jobProgress ? jobProgress.total : undefined}
                        unit="rows"
                        caption={jobProgress
                            ? `Importing records... ${Number(jobProgress.created || 0).toLocaleString()} saved · ${Number(jobProgress.skipped || 0).toLocaleString()} need review — please do not close this page.`
                            : undefined}
                        tipTitle={jobProgress ? "You can relax!" : "Almost there!"}
                        tip={jobProgress
                            ? "The import continues in the background while this screen shows live progress."
                            : "Large imports can take time. Please keep this window open while MIARCUS works."}
                    />

                )}

                {/* =====================================
                    HEADER
                ===================================== */}

                <div className="bulk-header">

                    <h2>{title}</h2>

                    <button

                        className="bulk-close"

                        onClick={onClose}

                        disabled={loading}

                    >

                        <FaTimes />

                    </button>

                </div>

                {/* =====================================
                    BODY
                ===================================== */}

                <div className="bulk-body">

                    <div

                        className={`bulk-dropzone ${dragging ? "dragging" : ""}`}

                        onDrop={handleDrop}

                        onDragOver={handleDragOver}

                        onDragLeave={handleDragLeave}

                    >

                        <FaCloudUploadAlt className="bulk-upload-icon" />

                        <h3>

                            Drag & Drop your file here

                        </h3>

                        <p>

                            or click below to browse

                        </p>

                        <input

                            ref={inputRef}

                            type="file"

                            accept={acceptedFile}

                            hidden

                            onChange={handleFileChange}

                        />

                        <button

                            type="button"

                            className="browse-btn"

                            onClick={() =>

                                inputRef.current.click()

                            }

                        >

                            Browse File

                        </button>

                        <small>

                            Supported:{" "}

                            {allowedExtensions.join(", ").toUpperCase()}

                        </small>

                    </div>

                    {

                        file && (

                            <div className="selected-file">

                                {

                                    (() => {

                                        const ext = file.name.split(".").pop().toLowerCase();

                                        if (ext === "csv") return <FaFileCsv />;
                                        if (ext === "pdf") return <FaFilePdf />;
                                        if (["jpg", "jpeg", "png", "webp"].includes(ext)) return <FaFileImage />;
                                        if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return <FaFileVideo />;

                                        return <FaFileExcel />;

                                    })()

                                }

                                <div className="selected-file-info">

                                    <strong>

                                        {file.name}

                                    </strong>

                                    <span>

                                        {formatFileSize(file.size)}

                                    </span>

                                </div>

                                <button

                                    className="remove-file-btn"

                                    onClick={removeFile}

                                    disabled={loading}

                                >

                                    <FaTimes />

                                </button>

                            </div>

                        )

                    }
                                        {/* =====================================
                        SAMPLE FILE
                    ===================================== */}

                    {

                        sampleFile && (

                            <div className="bulk-sample">

                                <a

                                    href={sampleFile}

                                    download

                                    className="sample-btn"

                                >

                                    <FaDownload />

                                    Download Sample File

                                </a>

                            </div>

                        )

                    }

                    {/* =====================================
                        RESULT — shows exactly which rows were
                        created/skipped and why, instead of a
                        single alert() that hides the detail.
                    ===================================== */}

                    {
                        result && (

                            <div className={`bulk-result ${result.success ? "bulk-result-success" : "bulk-result-error"}`}>

                                <div className="bulk-result-summary">
                                    {result.success ? <FaCheckCircle /> : <FaExclamationTriangle />}
                                    <span>{result.message}</span>
                                </div>

                                {result.errors.length > 0 && (
                                    <div className="bulk-result-list bulk-result-errors">
                                        <strong>Rows that couldn't be imported ({result.errors.length}):</strong>
                                        <ul>
                                            {result.errors.map((line, idx) => (
                                                <li key={`error-${idx}`}>{line}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {result.warnings.length > 0 && (
                                    <div className="bulk-result-list bulk-result-warnings">
                                        <strong>Please review ({result.warnings.length}):</strong>
                                        <ul>
                                            {result.warnings.map((line, idx) => (
                                                <li key={`warning-${idx}`}>{line}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                            </div>

                        )
                    }

                </div>

                {/* =====================================
                    FOOTER
                ===================================== */}

                <div className="bulk-footer">

                    <button

                        type="button"

                        className="cancel-btn"

                        disabled={loading}

                        onClick={() => {

                            removeFile();

                            onClose();

                        }}

                    >

                        Cancel

                    </button>

                    <button

                        type="button"

                        className="upload-btn"

                        disabled={loading || !file}

                        onClick={handleUpload}

                    >

                        <FaUpload />

                        {

                            loading

                                ? "Uploading..."

                                : "Upload"

                        }

                    </button>

                </div>

            </div>

        </div>

    );

}

export default BulkUploadModal;