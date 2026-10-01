import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    FaArrowLeft,
    FaArrowRight,
    FaCheck,
    FaCheckCircle,
    FaChevronDown,
    FaCloudUploadAlt,
    FaColumns,
    FaDownload,
    FaExclamationTriangle,
    FaFileAlt,
    FaFileCsv,
    FaFileExcel,
    FaFileImage,
    FaFilePdf,
    FaFileUpload,
    FaFileWord,
    FaInfoCircle,
    FaLightbulb,
    FaRedo,
    FaTimes,
    FaTimesCircle,
    FaTrashAlt,
    FaClone
} from "react-icons/fa";

import axios from "../../../axiosConfig.js";
import { exportTableData } from "../../../utils/exportUtils.js";
import {
    bulkAuthHeaders,
    downloadBulkSample,
    getBulkModule,
    inspectBulkFile
} from "../../../services/bulkUploadService.js";
import "../../../styles/common/BulkUploadModal.css";

// ==========================================================
// MI ARCUS — GLOBAL BULK UPLOAD MODAL
// ==========================================================
//
// One Bulk Upload experience for EVERY module:
//
//   1. Select file    Excel / CSV / Word / PDF / photo — any layout
//   2. Column check   which columns matched, were auto-corrected, are
//                     extra (saved too) or are missing
//   3. Processing     reading → validating → uploading valid rows
//   4. Result         Total / Uploaded / Failed / Skipped (duplicates)
//                     + every failed row with Excel row, column, value
//                     and exact reason + Download Error Report
//
// Usage (recommended):
//   <BulkUploadModal
//       isOpen={open}
//       onClose={() => setOpen(false)}
//       onSuccess={reload}
//       title="Visit Planner"
//       moduleKey="visit-plans"                      // server/config/bulkUploadModules.js
//       uploadUrl="/api/sales-team/visit-plans/import"
//   />
//
// Older pages that pass `uploadFunction(file)` keep working — the
// modal normalises whatever response shape they return.
// ==========================================================

const CHUNK_UPLOAD_BASE = "/api/uploads";
const INSPECT_LIMIT = 25 * 1024 * 1024; // larger files skip the preview step

const DEFAULT_ACCEPT =
    ".xlsx,.xls,.xlsm,.ods,.csv,.tsv,.txt,.docx,.doc,.pdf,.json,.jpg,.jpeg,.png,.webp";

const PROCESS_STEPS = [
    { key: "read", label: "Reading file" },
    { key: "headers", label: "Validating headers" },
    { key: "rows", label: "Validating data" },
    { key: "upload", label: "Uploading valid rows" },
    { key: "finalize", label: "Finalizing" },
    { key: "results", label: "Preparing results" }
];

// ----------------------------------------------------------
// helpers
// ----------------------------------------------------------

function formatFileSize(bytes) {
    if (!bytes && bytes !== 0) return "";
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function fileIcon(name = "") {
    const ext = name.split(".").pop().toLowerCase();
    if (["csv", "tsv", "txt"].includes(ext)) return FaFileCsv;
    if (ext === "pdf") return FaFilePdf;
    if (["doc", "docx"].includes(ext)) return FaFileWord;
    if (["jpg", "jpeg", "png", "webp"].includes(ext)) return FaFileImage;
    if (["xlsx", "xls", "xlsm", "ods"].includes(ext)) return FaFileExcel;
    return FaFileAlt;
}

function sourceLabelFor(name = "") {
    const ext = name.split(".").pop().toLowerCase();
    if (["csv", "tsv", "txt"].includes(ext)) return "CSV";
    if (ext === "pdf") return "PDF";
    if (["doc", "docx"].includes(ext)) return "Word";
    if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "Photo";
    return "Excel";
}

function formatDateTime(date = new Date()) {
    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function uploadFileInChunks(file, chunkSize, onProgress) {
    const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

    const init = await axios.post(
        `${CHUNK_UPLOAD_BASE}/init`,
        {
            originalName: file.name,
            mimetype: file.type || "application/octet-stream",
            totalSize: file.size,
            totalChunks
        },
        { headers: bulkAuthHeaders() }
    );

    const uploadId = init?.data?.uploadId;
    if (!uploadId) throw new Error("Could not start the large-file upload session.");

    try {
        for (let index = 0; index < totalChunks; index += 1) {
            const start = index * chunkSize;
            const blob = file.slice(start, Math.min(start + chunkSize, file.size));
            const formData = new FormData();
            formData.append("chunk", blob, `chunk-${index}`);
            await axios.post(`${CHUNK_UPLOAD_BASE}/${uploadId}/chunk/${index}`, formData, {
                headers: bulkAuthHeaders()
            });
            onProgress?.(Math.round(((index + 1) / totalChunks) * 100));
        }

        const complete = await axios.post(
            `${CHUNK_UPLOAD_BASE}/${uploadId}/complete`,
            {},
            { headers: bulkAuthHeaders() }
        );

        const token = complete?.data?.file?.token;
        if (!token) throw new Error("The server did not confirm the large file was received.");
        return token;
    } catch (error) {
        axios.delete(`${CHUNK_UPLOAD_BASE}/${uploadId}`, { headers: bulkAuthHeaders() }).catch(() => {});
        throw error;
    }
}

async function waitForBulkJob(body, onProgress) {
    if (!body?.processing || !body?.statusUrl) return body;

    const started = Date.now();
    const MAX_WAIT_MS = 24 * 60 * 60 * 1000;

    while (Date.now() - started < MAX_WAIT_MS) {
        const response = await axios.get(body.statusUrl, {
            headers: bulkAuthHeaders(),
            params: { _: Date.now() }
        });
        const job = response?.data?.job;
        if (!job) throw new Error("The server returned an invalid bulk-upload status.");
        onProgress?.(job);

        if (job.status === "completed" || job.status === "failed") {
            return {
                success: Boolean(job.success),
                completed: true,
                message: job.message,
                created: job.created,
                movedToReports: job.movedToReports,
                errors: job.errors || [],
                warnings: job.warnings || [],
                errorDetails: job.errorDetails || [],
                report: job.report || null,
                total: job.total
            };
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error("The import is taking longer than expected. Keep this window open and check the module again shortly.");
}

// Unwraps an axios response / { data: body } / plain body.
function unwrap(response) {
    if (!response) return {};
    if (response.data && typeof response.data === "object" && !Array.isArray(response.data) &&
        (response.status || response.headers || response.config)) {
        return response.data;
    }
    if (response.data && typeof response.data === "object" && !Array.isArray(response.data) &&
        ("success" in response.data || "report" in response.data || "errors" in response.data) &&
        !("success" in response) && !("report" in response)) {
        return response.data;
    }
    return response;
}

// "Row 7 · Store Code (ABC123): Store code does not exist"
// "Row 12: Invalid date" / "abc@x.com - Email already exists"
function parseLegacyError(text) {
    const str = String(text || "");
    let m = str.match(/^(?:(.+?) · )?Row (\d+)(?: · ([^(:]+?))?(?: \((.*)\))?: (.*)$/);
    if (m) {
        return { sheet: m[1] || null, row: Number(m[2]), column: (m[3] || "").trim(), value: m[4] || "", reason: m[5], type: "error" };
    }
    m = str.match(/row\s+(\d+)/i);
    return { row: m ? Number(m[1]) : null, column: "", value: "", reason: str, type: "error" };
}

// Turns any module's response into one standard result object.
function normalizeResult(raw, file) {
    const body = unwrap(raw) || {};
    const report = body.report || null;

    let details = [];

    if (Array.isArray(body.errorDetails) && body.errorDetails.length) {
        details = body.errorDetails;
    } else if (Array.isArray(report?.errorDetails) && report.errorDetails.length) {
        details = report.errorDetails;
    } else {
        const legacy = [
            ...(Array.isArray(body.errors) ? body.errors : []),
            ...(Array.isArray(body.data?.errors) ? body.data.errors : []),
            ...(Array.isArray(body.details) ? body.details : [])
        ];
        details = legacy.map((item) => {
            if (typeof item === "string") return parseLegacyError(item);
            return {
                row: item.row ?? item.rowNumber ?? null,
                column: item.column || "",
                value: item.value ?? "",
                reason: item.reason || item.message || item.error || "Invalid row",
                type: "error"
            };
        });
        if (Array.isArray(body.skippedRows)) {
            body.skippedRows.forEach((item) =>
                details.push({
                    row: item.rowNumber ?? item.row ?? null,
                    column: item.column || "",
                    value: item.value ?? item.question ?? "",
                    reason: item.reason || "Skipped",
                    type: "error"
                })
            );
        }
    }

    const summary = report?.summary || {};
    const failedRows = new Set(details.filter((d) => d.type === "error" || d.type === "file").map((d) => `${d.sheet || ""}#${d.row}`));
    const skippedRows = new Set(details.filter((d) => d.type === "duplicate").map((d) => `${d.sheet || ""}#${d.row}`));

    const uploaded =
        summary.uploaded ??
        body.uploaded ??
        body.imported ??
        body.created ??
        body.inserted ??
        ((body.insertedCount || 0) + (body.updatedCount || 0));

    const failed = summary.failed ?? body.failed ?? body.skippedCount ?? failedRows.size;
    const skipped = summary.skipped ?? skippedRows.size;
    const total =
        summary.total ??
        body.total ??
        body.totalRecords ??
        body.processed ??
        (Number(uploaded || 0) + Number(failed || 0) + Number(skipped || 0));

    const warnings = [
        ...(Array.isArray(report?.warnings) ? report.warnings : Array.isArray(body.warnings) ? body.warnings : []),
        ...(Array.isArray(body.unrecognizedColumns) && body.unrecognizedColumns.length
            ? [`Columns not recognised: ${body.unrecognizedColumns.join(", ")}`]
            : [])
    ].filter((w) => typeof w === "string");

    return {
        completed: body.completed !== false && (body.success !== undefined || report !== null || total > 0),
        success: Boolean(body.success),
        message: body.message || (body.success ? "Bulk upload completed." : "Upload failed."),
        fileName: report?.fileName || file?.name || "",
        sourceLabel: report?.sourceLabel || sourceLabelFor(file?.name),
        finishedAt: report?.finishedAt ? new Date(report.finishedAt) : new Date(),
        summary: {
            total: Number(total) || 0,
            uploaded: Number(uploaded) || 0,
            created: Number(summary.created ?? uploaded) || 0,
            updated: Number(summary.updated || body.updatedCount || 0),
            failed: Number(failed) || 0,
            skipped: Number(skipped) || 0
        },
        columns: report?.columns || null,
        details: details.filter((d) => d.type !== "warning"),
        notes: details.filter((d) => d.type === "warning"),
        warnings
    };
}

// ==========================================================
// COMPONENT
// ==========================================================

function BulkUploadModal({
    isOpen,
    onClose,
    onSuccess,
    uploadFunction,
    uploadUrl,
    moduleKey,
    title = "Bulk Upload",
    acceptedFile = DEFAULT_ACCEPT,
    sampleFile = null,
    maxFileSize = 100 * 1024 * 1024 * 1024,
    enableChunkedUpload = false,
    chunkThreshold = 20 * 1024 * 1024,
    chunkSize = 10 * 1024 * 1024,
    extraFormData = null
}) {
    const [screen, setScreen] = useState("select"); // select | validate | processing | result | sample
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [spec, setSpec] = useState(null);
    const [inspection, setInspection] = useState(null);
    const [inspecting, setInspecting] = useState(false);
    const [inspectError, setInspectError] = useState("");
    const [stepIndex, setStepIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState("");
    const [result, setResult] = useState(null);
    const [fatal, setFatal] = useState("");
    const [reportMenu, setReportMenu] = useState(false);
    const [uploadedSomething, setUploadedSomething] = useState(false);

    const inputRef = useRef(null);
    const timerRef = useRef(null);

    // Every accepted format — the old per-page lists (".csv,.xlsx,.xls")
    // are widened so Word / PDF / photo always work everywhere.
    const allowed = useMemo(() => {
        const list = String(acceptedFile || "")
            .split(",")
            .map((e) => e.trim().replace(/^\./, "").toLowerCase())
            .filter(Boolean);
        DEFAULT_ACCEPT.split(",").forEach((e) => {
            const ext = e.replace(/^\./, "");
            if (!list.includes(ext)) list.push(ext);
        });
        return list.filter((e) => !["mp4", "mov", "avi", "mkv", "webm"].includes(e));
    }, [acceptedFile]);

    const acceptAttr = allowed.map((e) => `.${e}`).join(",");

    // ------------------------------------------------------
    // open / close
    // ------------------------------------------------------

    const resetAll = useCallback(() => {
        setScreen("select");
        setFile(null);
        setDragging(false);
        setInspection(null);
        setInspecting(false);
        setInspectError("");
        setStepIndex(0);
        setProgress(0);
        setProgressText("");
        setResult(null);
        setFatal("");
        setReportMenu(false);
        if (inputRef.current) inputRef.current.value = "";
        clearInterval(timerRef.current);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            resetAll();
            setUploadedSomething(false);
            return;
        }
        if (moduleKey) {
            getBulkModule(moduleKey)
                .then((data) => setSpec(data))
                .catch(() => setSpec(null));
        }
    }, [isOpen, moduleKey, resetAll]);

    useEffect(() => () => clearInterval(timerRef.current), []);

    const busy = screen === "processing";

    const close = async () => {
        if (busy) return;
        const refresh = uploadedSomething;
        resetAll();
        setUploadedSomething(false);
        if (refresh && onSuccess) {
            try {
                await onSuccess();
            } catch {
                // the page handles its own refresh errors
            }
        }
        onClose?.();
    };

    // ------------------------------------------------------
    // file selection
    // ------------------------------------------------------

    const validateFile = (selected) => {
        if (!selected) return false;
        const ext = selected.name.split(".").pop().toLowerCase();
        if (!allowed.includes(ext)) {
            setFatal(`".${ext}" files can't be read as rows. Upload Excel, CSV, Word, PDF or a photo of the list.`);
            return false;
        }
        if (selected.size > maxFileSize) {
            setFatal(`This file is larger than the ${formatFileSize(maxFileSize)} limit.`);
            return false;
        }
        setFatal("");
        return true;
    };

    const runInspection = async (selected) => {
        setInspection(null);
        setInspectError("");
        if (!moduleKey || selected.size > INSPECT_LIMIT) return;
        setInspecting(true);
        try {
            const data = await inspectBulkFile(moduleKey, selected);
            setInspection(data);
            setScreen("validate");
        } catch (error) {
            const message = error?.response?.data?.message || "";
            // A file the server cannot read at all is reported now;
            // anything else (network, old server) simply skips the preview.
            if (error?.response?.status === 400 && message) {
                setInspectError(message);
            }
        } finally {
            setInspecting(false);
        }
    };

    const pick = (selected) => {
        if (!validateFile(selected)) return;
        setFile(selected);
        runInspection(selected);
    };

    const removeFile = () => {
        setFile(null);
        setInspection(null);
        setInspectError("");
        setScreen("select");
        if (inputRef.current) inputRef.current.value = "";
    };

    // ------------------------------------------------------
    // upload
    // ------------------------------------------------------

    const startStepTimer = () => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setStepIndex((i) => (i < 3 ? i + 1 : i));
            setProgress((p) => (p < 92 ? p + Math.max(1, Math.round((92 - p) / 12)) : p));
        }, 1100);
    };

    const handleUpload = async () => {
        if (!file) return;

        setScreen("processing");
        setStepIndex(0);
        setProgress(2);
        setProgressText("Sending your file…");
        setResult(null);
        setFatal("");

        let body;

        try {
            const useChunks = enableChunkedUpload && file.size > chunkThreshold;

            if (uploadUrl) {
                if (useChunks) {
                    const assembledFile = await uploadFileInChunks(file, chunkSize, (p) => {
                        setProgress(Math.round(p * 0.3));
                        setProgressText(`Uploading large file… ${p}%`);
                    });
                    setStepIndex(1);
                    startStepTimer();
                    const response = await axios.post(uploadUrl, { assembledFile, ...(extraFormData || {}) }, { headers: bulkAuthHeaders() });
                    body = response.data;
                } else {
                    const formData = new FormData();
                    formData.append("file", file);
                    Object.entries(extraFormData || {}).forEach(([k, v]) => formData.append(k, v));
                    const response = await axios.post(uploadUrl, formData, {
                        headers: bulkAuthHeaders(),
                        onUploadProgress: (event) => {
                            if (!event.total) return;
                            const p = Math.round((event.loaded / event.total) * 100);
                            setProgress(Math.round(p * 0.3));
                            setProgressText(`Uploading file… ${p}%`);
                            if (p >= 100) {
                                setStepIndex(1);
                                setProgressText("Checking every row…");
                                startStepTimer();
                            }
                        }
                    });
                    body = response.data;
                }
            } else if (uploadFunction) {
                startStepTimer();
                if (useChunks) {
                    const assembledFile = await uploadFileInChunks(file, chunkSize, (p) => setProgressText(`Uploading large file… ${p}%`));
                    body = await uploadFunction(file, { assembledFile });
                } else {
                    body = await uploadFunction(file);
                }
                body = unwrap(body);
            } else {
                throw new Error("This page has no upload address configured.");
            }

            if (body?.processing && body?.statusUrl) {
                clearInterval(timerRef.current);
                setStepIndex(2);
                body = await waitForBulkJob(body, (job) => {
                    const pct = Number(job.percent || 0);
                    setProgress(30 + Math.round(pct * 0.65));
                    setStepIndex(pct >= 100 ? 4 : pct > 0 ? 3 : 2);
                    setProgressText(
                        job.total
                            ? `${Number(job.processed || 0).toLocaleString()} of ${Number(job.total).toLocaleString()} rows processed · ${Number(job.created || 0).toLocaleString()} saved · ${Number(job.skipped || 0).toLocaleString()} need review`
                            : job.message || "Processing…"
                    );
                });
            }
        } catch (error) {
            const data = error?.response?.data;
            if (data && (data.report || data.errorDetails || Array.isArray(data.errors))) {
                body = data;
            } else {
                clearInterval(timerRef.current);
                setResult({
                    ...normalizeResult({ success: false, message: data?.message || error.message || "Upload failed." }, file),
                    fatal: data?.message || error.message || "Upload failed."
                });
                setScreen("result");
                return;
            }
        }

        clearInterval(timerRef.current);
        setStepIndex(5);
        setProgress(100);

        const normalized = normalizeResult(body, file);
        if (normalized.summary.uploaded > 0) setUploadedSomething(true);

        // Some legacy endpoints answer success without any counts.
        if (normalized.success && !normalized.summary.total && !normalized.details.length) {
            normalized.summary.uploaded = normalized.summary.uploaded || 0;
        }

        setTimeout(() => {
            setResult(normalized);
            setScreen("result");
        }, 350);
    };

    // ------------------------------------------------------
    // error report
    // ------------------------------------------------------

    const downloadErrorReport = async (format) => {
        setReportMenu(false);
        if (!result) return;
        const all = [...result.details, ...result.notes];
        const hasSheet = all.some((d) => d.sheet);
        const headers = [
            "#",
            ...(hasSheet ? ["Sheet"] : []),
            `${result.sourceLabel || "Excel"} Row`,
            "Column",
            "Value",
            "Error Reason",
            "Type"
        ];
        const rows = all.map((d, i) => [
            i + 1,
            ...(hasSheet ? [d.sheet || ""] : []),
            d.row ?? "",
            d.column || "",
            d.value ?? "",
            d.reason || "",
            d.type === "duplicate" ? "Skipped (duplicate)" : d.type === "warning" ? "Saved with note" : "Failed"
        ]);
        const base = (result.fileName || title).replace(/\.[^.]+$/, "");
        await exportTableData({
            headers,
            rows,
            filename: `${base}_Error_Report`,
            format,
            title: `${title} — Error Report`,
            sheetName: "Error Report"
        });
    };

    const uploadAnother = () => {
        resetAll();
    };

    if (!isOpen) return null;

    // ------------------------------------------------------
    // render pieces
    // ------------------------------------------------------

    const SelectedFileCard = ({ showRemove = true }) => {
        if (!file) return null;
        const Icon = fileIcon(file.name);
        return (
            <div className="bum-file-card">
                <span className="bum-file-icon"><Icon /></span>
                <div className="bum-file-meta">
                    <strong title={file.name}>{file.name}</strong>
                    <span>
                        {formatFileSize(file.size)}
                        {inspection ? ` · ${inspection.rowsDetected.toLocaleString()} rows detected` : ""}
                    </span>
                </div>
                {showRemove && (
                    <button type="button" className="bum-icon-btn danger" onClick={removeFile} title="Remove file">
                        <FaTrashAlt />
                    </button>
                )}
            </div>
        );
    };

    const requiredColumns = spec?.columns || [];

    const renderSelect = () => (
        <>
            <div className="bum-info-card">
                <span className="bum-info-icon"><FaFileUpload /></span>
                <div>
                    <h4>Upload Excel, CSV, Word or PDF File</h4>
                    <p>
                        Columns are matched by header name in any order. Extra columns are saved too.
                        Valid rows are uploaded even if some rows fail.
                    </p>
                    <div className="bum-chips">
                        <span className="bum-chip xls"><FaFileExcel /> XLSX</span>
                        <span className="bum-chip xls"><FaFileExcel /> XLS</span>
                        <span className="bum-chip csv"><FaFileCsv /> CSV</span>
                        <span className="bum-chip doc"><FaFileWord /> DOCX</span>
                        <span className="bum-chip pdf"><FaFilePdf /> PDF</span>
                    </div>
                </div>
            </div>

            {!file ? (
                <div
                    className={`bum-dropzone ${dragging ? "dragging" : ""}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
                    onClick={() => inputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                >
                    <FaCloudUploadAlt className="bum-drop-icon" />
                    <h3>Drop your file here</h3>
                    <p>or click to browse</p>
                    <button type="button" className="bum-primary-btn" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                        Select File
                    </button>
                </div>
            ) : (
                <>
                    <SelectedFileCard />
                    {inspecting && (
                        <div className="bum-note info">
                            <span className="bum-spinner" /> Checking the columns in your file…
                        </div>
                    )}
                </>
            )}

            <input ref={inputRef} type="file" accept={acceptAttr} hidden onChange={(e) => pick(e.target.files[0])} />

            {(fatal || inspectError) && (
                <div className="bum-note error"><FaExclamationTriangle /> {fatal || inspectError}</div>
            )}

            {requiredColumns.length > 0 && !file && (
                <div className="bum-section">
                    <h5>Columns for {spec?.title || title}</h5>
                    <div className="bum-table-wrap">
                        <table className="bum-table">
                            <thead>
                                <tr><th>#</th><th>Column Name</th><th className="center">Required</th></tr>
                            </thead>
                            <tbody>
                                {requiredColumns.map((c, i) => (
                                    <tr key={c.name}>
                                        <td>{i + 1}</td>
                                        <td>
                                            {c.name}
                                            {c.requiredGroup && <small className="bum-muted"> (or {c.requiredGroup.filter((n) => n !== c.name).join(" / ")})</small>}
                                        </td>
                                        <td className="center">
                                            {c.required
                                                ? <span className="bum-yes"><FaCheck /> Yes</span>
                                                : <span className="bum-no">No</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ul className="bum-checklist">
                <li><FaCheckCircle /> Header names are matched automatically (any order, any case)</li>
                <li><FaCheckCircle /> Extra columns are uploaded with their exact column name</li>
                <li><FaCheckCircle /> All valid rows will be uploaded</li>
                <li><FaCheckCircle /> If any row fails, the exact row, column and reason are shown</li>
                <li><FaCheckCircle /> You can download the sample file for reference</li>
            </ul>

            {(moduleKey || sampleFile) && (
                <button
                    type="button"
                    className="bum-soft-btn"
                    onClick={() => (moduleKey ? setScreen("sample") : window.open(sampleFile, "_blank"))}
                >
                    <FaDownload /> Download Sample File
                </button>
            )}
        </>
    );

    const renderValidate = () => {
        const cols = inspection?.columns;
        const missing = cols?.missingRequired || [];
        const ok = missing.length === 0;
        return (
            <>
                <SelectedFileCard />

                <div className={`bum-banner ${ok ? "success" : "warning"}`}>
                    <span className="bum-banner-icon">{ok ? <FaCheck /> : <FaExclamationTriangle />}</span>
                    <div>
                        <h4>
                            {ok ? "Columns Matched Successfully" : "Some required columns are missing"}
                        </h4>
                        <p>
                            {inspection.columnsDetected} column{inspection.columnsDetected === 1 ? "" : "s"} detected ·{" "}
                            {inspection.rowsDetected.toLocaleString()} row{inspection.rowsDetected === 1 ? "" : "s"} found
                            {cols?.extra?.length ? ` · ${cols.extra.length} extra column${cols.extra.length === 1 ? "" : "s"} will also be saved` : ""}
                        </p>
                        {!ok && (
                            <p className="bum-strong">
                                Missing: {missing.join(", ")}. You can still upload — rows that need {missing.length === 1 ? "this column" : "these columns"} will be listed as failed with the reason.
                            </p>
                        )}
                    </div>
                </div>

                <div className="bum-table-wrap">
                    <table className="bum-table">
                        <thead>
                            <tr>
                                <th>{inspection.sourceLabel || "File"} Column</th>
                                <th>System Column</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(cols?.columns || []).map((c, i) => (
                                <tr key={`${c.source}-${i}`}>
                                    <td>{c.sheet ? <small className="bum-muted">{c.sheet} · </small> : null}{c.source}</td>
                                    <td>{c.target || <span className="bum-muted">— (new column)</span>}</td>
                                    <td>
                                        {c.status === "matched" && <span className="bum-status ok"><FaCheckCircle /> Matched</span>}
                                        {c.status === "corrected" && <span className="bum-status warn" title={`Header "${c.source}" was read as "${c.target}"`}><FaInfoCircle /> Auto-matched</span>}
                                        {c.status === "extra" && <span className="bum-status extra"><FaClone /> Extra · will be saved</span>}
                                    </td>
                                </tr>
                            ))}
                            {missing.map((name) => (
                                <tr key={`missing-${name}`} className="missing">
                                    <td><span className="bum-muted">— not in file —</span></td>
                                    <td>{name}</td>
                                    <td><span className="bum-status bad"><FaTimesCircle /> Missing (required)</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {(inspection.warnings || []).length > 0 && (
                    <div className="bum-note warn">
                        <FaInfoCircle />
                        <div>{inspection.warnings.map((w, i) => <p key={i}>{w}</p>)}</div>
                    </div>
                )}

                <div className="bum-note info">
                    <FaInfoCircle />
                    <div>
                        <p><strong>Note:</strong> Column names are not case-sensitive. Every column of your file — including extra columns — is stored with the uploaded records.</p>
                    </div>
                </div>
            </>
        );
    };

    const renderProcessing = () => (
        <>
            <SelectedFileCard showRemove={false} />
            <div className="bum-progress-card">
                <div className="bum-progress-head">
                    <span className="bum-spinner big" />
                    <div>
                        <h4>Uploading and Validating…</h4>
                        <p>{progressText || "Please wait while we process your file."}</p>
                    </div>
                </div>
                <div className="bum-progress-bar">
                    <span style={{ width: `${progress}%` }} />
                </div>
                <div className="bum-progress-pct">{progress}%</div>
                <ol className="bum-steps">
                    {PROCESS_STEPS.map((step, i) => (
                        <li key={step.key} className={i < stepIndex ? "done" : i === stepIndex ? "active" : ""}>
                            <span className="bum-step-dot">{i < stepIndex ? <FaCheck /> : null}</span>
                            <span className="bum-step-label">{step.label}</span>
                            <span className="bum-step-state">
                                {i < stepIndex ? "Completed" : i === stepIndex ? "In progress…" : "Please wait…"}
                            </span>
                        </li>
                    ))}
                </ol>
            </div>
            <div className="bum-note tip">
                <FaLightbulb />
                <div>
                    <p>We are processing all rows. Valid rows will be uploaded. Invalid rows will be listed with exact reasons. Please keep this window open.</p>
                </div>
            </div>
        </>
    );

    const renderResult = () => {
        if (!result) return null;
        const s = result.summary;
        const failedAll = result.fatal || (!s.uploaded && (s.failed || s.skipped || !s.total));
        const hasIssues = result.details.length > 0 || result.notes.length > 0;
        const rowLabel = `${result.sourceLabel || "Excel"} Row`;

        return (
            <>
                <div className={`bum-banner ${failedAll ? (result.fatal ? "error" : "warning") : "success"}`}>
                    <span className="bum-banner-icon">{failedAll ? (result.fatal ? <FaTimes /> : <FaExclamationTriangle />) : <FaCheck />}</span>
                    <div>
                        <h4>{result.fatal ? "Upload could not start" : "Bulk Upload Completed"}</h4>
                        <p>{formatDateTime(result.finishedAt)}{result.fileName ? ` · ${result.fileName}` : ""}</p>
                        {result.fatal && <p className="bum-strong">{result.fatal}</p>}
                    </div>
                </div>

                {!result.fatal && (
                    <div className="bum-stats">
                        <div className="bum-stat total">
                            <span className="bum-stat-icon"><FaFileAlt /></span>
                            <div><small>Total Rows</small><strong>{s.total.toLocaleString()}</strong></div>
                        </div>
                        <div className="bum-stat ok">
                            <span className="bum-stat-icon"><FaCheck /></span>
                            <div>
                                <small>Successfully Uploaded</small>
                                <strong>{s.uploaded.toLocaleString()}</strong>
                                {s.updated > 0 && <em>{s.updated.toLocaleString()} updated</em>}
                            </div>
                        </div>
                        <div className="bum-stat bad">
                            <span className="bum-stat-icon"><FaTimes /></span>
                            <div><small>Failed Rows</small><strong>{s.failed.toLocaleString()}</strong></div>
                        </div>
                        <div className="bum-stat skip">
                            <span className="bum-stat-icon"><FaClone /></span>
                            <div><small>Skipped (Duplicates)</small><strong>{s.skipped.toLocaleString()}</strong></div>
                        </div>
                    </div>
                )}

                <div className="bum-result-actions">
                    {hasIssues && (
                        <div className="bum-menu-wrap">
                            <button type="button" className="bum-outline-btn" onClick={() => setReportMenu((v) => !v)}>
                                <FaDownload /> Download Error Report <FaChevronDown className="bum-caret" />
                            </button>
                            {reportMenu && (
                                <div className="bum-menu">
                                    <button type="button" onClick={() => downloadErrorReport("xlsx")}><FaFileExcel /> Excel (XLSX)</button>
                                    <button type="button" onClick={() => downloadErrorReport("csv")}><FaFileCsv /> CSV</button>
                                    <button type="button" onClick={() => downloadErrorReport("pdf")}><FaFilePdf /> PDF</button>
                                </div>
                            )}
                        </div>
                    )}
                    <button type="button" className="bum-outline-btn" onClick={uploadAnother}>
                        <FaRedo /> Upload Another File
                    </button>
                </div>

                {result.details.length > 0 && (
                    <div className="bum-section">
                        <div className="bum-section-title bad"><FaTimesCircle /> Failed Rows Details</div>
                        <div className="bum-table-wrap tall">
                            <table className="bum-table errors">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>{rowLabel}</th>
                                        <th>Column</th>
                                        <th>Value</th>
                                        <th>Error Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.details.map((d, i) => (
                                        <tr key={i} className={d.type === "duplicate" ? "dup" : ""}>
                                            <td>{i + 1}</td>
                                            <td className="nowrap">{d.sheet ? <small className="bum-muted">{d.sheet} · </small> : null}{d.row ?? "—"}</td>
                                            <td>{d.column || "—"}</td>
                                            <td className="value">{d.value === "" || d.value === undefined || d.value === null ? <span className="bum-muted">(empty)</span> : String(d.value)}</td>
                                            <td className="reason">
                                                {d.type === "duplicate" && <span className="bum-tag dup">Duplicate</span>}
                                                {d.reason}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {result.notes.length > 0 && (
                    <div className="bum-section">
                        <div className="bum-section-title warn"><FaInfoCircle /> Saved with notes</div>
                        <div className="bum-table-wrap">
                            <table className="bum-table">
                                <thead><tr><th>{rowLabel}</th><th>Column</th><th>Value</th><th>Note</th></tr></thead>
                                <tbody>
                                    {result.notes.map((d, i) => (
                                        <tr key={i}><td>{d.row ?? "—"}</td><td>{d.column || "—"}</td><td>{String(d.value ?? "")}</td><td>{d.reason}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {result.columns && (result.columns.extra?.length > 0 || result.columns.corrected?.length > 0) && (
                    <div className="bum-note info">
                        <FaColumns />
                        <div>
                            {result.columns.extra?.length > 0 && (
                                <p><strong>Extra columns saved:</strong> {result.columns.extra.join(", ")}</p>
                            )}
                            {result.columns.corrected?.length > 0 && (
                                <p><strong>Auto-matched headers:</strong> {result.columns.corrected.map((c) => `"${c.source}" → ${c.target}`).join(", ")}</p>
                            )}
                        </div>
                    </div>
                )}

                {result.warnings.length > 0 && (
                    <div className="bum-note warn">
                        <FaInfoCircle />
                        <div>{result.warnings.map((w, i) => <p key={i}>{w}</p>)}</div>
                    </div>
                )}

                {!result.fatal && !hasIssues && s.uploaded > 0 && (
                    <div className="bum-note success"><FaCheckCircle /> Every row was uploaded successfully.</div>
                )}
            </>
        );
    };

    const renderSample = () => {
        const cols = spec?.columns || [];
        const sampleRows = Array.from({ length: Math.min(spec?.sampleRowCount || 1, 3) }, (_, r) =>
            cols.map((c) => (c.sample.length ? c.sample[Math.min(r, c.sample.length - 1)] : ""))
        );
        return (
            <>
                <p className="bum-lead">
                    Use this sample file for {spec?.title || title} bulk upload. Column names are matched automatically,
                    and you may add your own extra columns — they are saved too.
                </p>
                <div className="bum-table-wrap">
                    <table className="bum-table sheet">
                        <thead>
                            <tr>
                                <th className="rownum" />
                                {cols.map((c, i) => <th key={c.name} className="letter">{String.fromCharCode(65 + (i % 26))}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="hdr">
                                <td className="rownum">1</td>
                                {cols.map((c) => <td key={c.name}>{c.name}{c.required ? " *" : ""}</td>)}
                            </tr>
                            {sampleRows.map((row, r) => (
                                <tr key={r}>
                                    <td className="rownum">{r + 2}</td>
                                    {row.map((v, i) => <td key={i}>{v}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bum-section">
                    <h5>Column Guidelines</h5>
                    <ul className="bum-checklist">
                        {[...new Set(
                            cols
                                .filter((c) => c.required || c.help)
                                .map((c) => {
                                    const base = c.requiredGroup
                                        ? `${c.requiredGroup.join(" or ")} — at least one is required`
                                        : c.required
                                            ? `${c.name} is required`
                                            : c.name;
                                    return c.help && !c.requiredGroup ? `${base}: ${c.help}` : base;
                                })
                        )].map((line) => (
                            <li key={line}><FaCheckCircle /> {line}</li>
                        ))}
                        {(spec?.guidelines || []).map((g, i) => <li key={i}><FaCheckCircle /> {g}</li>)}
                    </ul>
                </div>

                <button type="button" className="bum-primary-btn wide" onClick={() => downloadBulkSample(moduleKey, "xlsx").catch(() => alert("Unable to download the sample file."))}>
                    <FaDownload /> Download Excel Sample File
                </button>
                <button type="button" className="bum-outline-btn wide" onClick={() => downloadBulkSample(moduleKey, "csv").catch(() => alert("Unable to download the sample file."))}>
                    <FaFileCsv /> Download CSV Sample File
                </button>
            </>
        );
    };

    // ------------------------------------------------------
    // layout
    // ------------------------------------------------------

    const heading = {
        select: `Bulk Upload - ${title.replace(/^Bulk Upload\s*-?\s*/i, "")}`,
        validate: "Column Validation",
        processing: `Bulk Upload - ${title.replace(/^Bulk Upload\s*-?\s*/i, "")}`,
        result: "Bulk Upload Result",
        sample: "Download Sample File"
    }[screen];

    const canGoBack = ["validate", "sample"].includes(screen);

    return (
        <div className="bum-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) close(); }}>
            <div className="bum-modal" role="dialog" aria-modal="true" aria-label={heading}>
                <div className="bum-header">
                    {canGoBack ? (
                        <button type="button" className="bum-icon-btn" onClick={() => setScreen("select")} title="Back">
                            <FaArrowLeft />
                        </button>
                    ) : <span className="bum-header-spacer" />}
                    <h2>{heading}</h2>
                    <button type="button" className="bum-icon-btn" onClick={close} disabled={busy} title="Close">
                        <FaTimes />
                    </button>
                </div>

                <div className="bum-body">
                    {screen === "select" && renderSelect()}
                    {screen === "validate" && inspection && renderValidate()}
                    {screen === "processing" && renderProcessing()}
                    {screen === "result" && renderResult()}
                    {screen === "sample" && renderSample()}
                </div>

                {screen === "select" && file && !inspecting && (
                    <div className="bum-footer">
                        <button type="button" className="bum-secondary-btn" onClick={removeFile}>Change File</button>
                        <button type="button" className="bum-primary-btn" onClick={handleUpload} disabled={!!inspectError}>
                            Upload <FaArrowRight />
                        </button>
                    </div>
                )}

                {screen === "validate" && (
                    <div className="bum-footer">
                        <button type="button" className="bum-secondary-btn" onClick={removeFile}>Back</button>
                        <button type="button" className="bum-primary-btn" onClick={handleUpload}>
                            Proceed to Upload <FaArrowRight />
                        </button>
                    </div>
                )}

                {screen === "result" && (
                    <div className="bum-footer">
                        <button type="button" className="bum-primary-btn" onClick={close}>Done</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default BulkUploadModal;
