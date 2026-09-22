// ==========================================================
// MI ARCUS — IN-PROCESS BULK IMPORT JOB MANAGER
// ==========================================================
//
// Bulk CSV/XLSX imports can take longer than an IIS/ARR proxy is
// willing to keep an HTTP request open. The file is therefore received
// first and the actual parse/import runs in the Node process as a job.
// The browser polls the status endpoint and can show real progress.
//
// Jobs intentionally live in memory: they are short-lived import
// operations, and the uploaded file remains on disk until the job ends.
// If PM2 is restarted while a job is running, the job is lost and the
// user must upload the file again. No database data is rolled back by
// a process restart, so already-created rows remain safe.
// ==========================================================

const crypto = require("crypto");

const jobs = new Map();
const MAX_ERROR_DETAILS = 5000;

function createJob(type, userId, file) {
    const id = crypto.randomUUID();

    const job = {
        id,
        type,
        userId,
        status: "queued",
        success: false,
        message: "Upload received. Preparing your file…",
        total: 0,
        processed: 0,
        created: 0,
        movedToReports: 0,
        skipped: 0,
        warnings: [],
        errors: [],
        startedAt: null,
        finishedAt: null,
        fileName: file?.originalname || "bulk-upload"
    };

    jobs.set(id, job);
    return job;
}

function updateJob(id, patch = {}) {
    const job = jobs.get(id);
    if (!job) return null;

    Object.assign(job, patch);

    if (Array.isArray(job.errors) && job.errors.length > MAX_ERROR_DETAILS) {
        job.errors = job.errors.slice(0, MAX_ERROR_DETAILS);
    }
    if (Array.isArray(job.warnings) && job.warnings.length > MAX_ERROR_DETAILS) {
        job.warnings = job.warnings.slice(0, MAX_ERROR_DETAILS);
    }

    return job;
}

function getJob(id, userId) {
    const job = jobs.get(id);
    if (!job) return null;
    if (userId !== undefined && Number(job.userId) !== Number(userId)) return null;
    return job;
}

function publicJob(job) {
    if (!job) return null;

    const total = Number(job.total) || 0;
    const processed = Number(job.processed) || 0;
    const percent = total > 0
        ? Math.min(100, Math.round((processed / total) * 100))
        : job.status === "completed"
            ? 100
            : 0;

    return {
        id: job.id,
        type: job.type,
        status: job.status,
        success: Boolean(job.success),
        message: job.message,
        fileName: job.fileName,
        total,
        processed,
        created: Number(job.created) || 0,
        movedToReports: Number(job.movedToReports) || 0,
        skipped: Number(job.skipped) || 0,
        percent,
        warnings: Array.isArray(job.warnings) ? job.warnings : [],
        errors: Array.isArray(job.errors) ? job.errors : [],
        startedAt: job.startedAt,
        finishedAt: job.finishedAt
    };
}

// Keep completed jobs available long enough for a slow browser/poll.
// The job record is tiny compared with the imported file.
function scheduleCleanup(id, delayMs = 6 * 60 * 60 * 1000) {
    setTimeout(() => jobs.delete(id), delayMs).unref?.();
}

function finishJob(id, patch = {}) {
    const job = updateJob(id, {
        ...patch,
        status: patch.status || "completed",
        finishedAt: new Date().toISOString()
    });

    if (job) scheduleCleanup(id);
    return job;
}

module.exports = {
    createJob,
    updateJob,
    getJob,
    publicJob,
    finishJob
};
