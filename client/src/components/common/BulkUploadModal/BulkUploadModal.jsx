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

import "../../../styles/common/BulkUploadModal.css";

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

    // Raised from 10 MB to 100 MB to match the server-side limit — see
    // server/middleware/bulkFileUpload.js and server/middleware/fileSecurity.js.
    maxFileSize = 100 * 1024 * 1024 // 100 MB

}) {

    // ======================================================
    // STATES
    // ======================================================

    const [file, setFile] = useState(null);

    const [loading, setLoading] = useState(false);

    const [dragging, setDragging] = useState(false);

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

            alert(

                `Maximum file size is ${Math.round(maxFileSize / (1024 * 1024))} MB.`

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

            // Pass File only.
            // Each page creates its own FormData.

            const response = await uploadFunction(file);

            // Collect the row-by-row detail wherever the caller's API put
            // it, so "why didn't this row import?" is always answerable
            // from the modal instead of a vague popup.
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

                    <div className="bulk-processing-overlay">

                        <div className="bulk-processing-spinner" />

                        <strong>Processing your file…</strong>

                        <span>
                            This can take a moment for large files.
                            Please don't close this window.
                        </span>

                    </div>

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

                                        {(file.size / 1024).toFixed(2)} KB

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