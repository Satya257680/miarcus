// ======================================================
// ACTION POINT ATTACHMENTS
// ------------------------------------------------------
// One list of every file that belongs to an Action Point, used by the
// Attachment "View" link on Action Points and Completed Action Points:
//
//   1. the Action Point's own attachment (Add / Edit form)
//   2. Take Action photos (action_points.action_photos JSON)
//   3. the originating checklist question's photo evidence
//      (checklist_submission_answers.photos JSON)
//   4. the checklist submission attachment (cs.attachment)
//
// Every entry is reduced to the "uploads/..." reference the secure
// /api/files route serves (or a plain http(s) URL for "From Website"
// photos), so the browser never receives a server disk path such as
// "C:/miarcus/server/uploads/...". Anything that tries to climb out of
// uploads/ ("..") is dropped.
// ======================================================

const parseList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        const text = value.trim();
        if (!text) return [];
        if (text.startsWith("[")) {
            try {
                const parsed = JSON.parse(text);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [text];
    }
    return [];
};

const toSafeReference = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return null;

    if (/^https?:\/\//i.test(raw)) {
        return raw.length <= 1000 && !/\s/.test(raw) ? raw : null;
    }

    const normalized = raw.replace(/\\/g, "/");
    const marker = normalized.toLowerCase().lastIndexOf("uploads/");
    const relative = (marker >= 0
        ? normalized.slice(marker + "uploads/".length)
        : normalized.split("/").pop()
    ).replace(/^\/+/, "");

    if (!relative || relative.split("/").some((part) => part === ".." || part === ".")) {
        return null;
    }

    return `uploads/${relative}`;
};

const fileNameOf = (reference) => {
    const last = String(reference || "").split("?")[0].split("/").pop() || "attachment";
    try {
        return decodeURIComponent(last);
    } catch {
        return last;
    }
};

/**
 * @param {object} row  Action Point row with attachment / action_photos /
 *                      answer_photos / submission_attachment columns.
 * @returns {{ path: string, name: string, label: string, source: string }[]}
 */
const buildAttachmentList = (row = {}) => {
    const items = [];
    const seen = new Set();

    const push = (value, label, source) => {
        const path = toSafeReference(value);
        if (!path || seen.has(path)) return;
        seen.add(path);
        items.push({ path, name: fileNameOf(path), label, source });
    };

    push(row.attachment, "Action Point attachment", "Action Points");

    parseList(row.action_photos).forEach((photo, index, all) =>
        push(photo, all.length > 1 ? `Take Action photo ${index + 1}` : "Take Action photo", "Action Points")
    );

    parseList(row.answer_photos).forEach((photo, index, all) =>
        push(photo, all.length > 1 ? `Question evidence ${index + 1}` : "Question evidence", "Checklist Submission")
    );

    push(row.submission_attachment, "Checklist attachment", "Checklist Submission");

    return items;
};

/**
 * Adds `attachments` (safe list) and `attachment_count` to a row and drops
 * the raw evidence columns that were only needed to build the list.
 */
const withAttachments = (row) => {
    if (!row || typeof row !== "object") return row;
    const attachments = buildAttachmentList(row);
    const { action_photos, answer_photos, submission_attachment, ...rest } = row;
    void action_photos;
    void answer_photos;
    void submission_attachment;
    return {
        ...rest,
        attachments,
        attachment_count: attachments.length
    };
};

module.exports = {
    buildAttachmentList,
    withAttachments,
    toSafeReference,
    parseList
};
