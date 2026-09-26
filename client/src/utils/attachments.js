import axios from "../axiosConfig.js";

// ======================================================
// ATTACHMENTS
//
// Checklist / Action Point attachments were saved with the
// server's full disk path (e.g. "C:/miarcus/server/uploads/123.pdf"),
// which produced broken links like
// https://rytual2.miarcus.com/api/C:/miarcus/server/uploads/123.pdf
//
// Every attachment is now opened through the secure
// /api/files route (sent with the user's login token), using only
// the part of the path after "uploads/".
// ======================================================

export const attachmentPath = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^(https?:|blob:|data:)/i.test(raw)) return raw;

    const normalized = raw.replace(/\\/g, "/");
    const marker = normalized.toLowerCase().lastIndexOf("uploads/");
    const relative = marker >= 0
        ? normalized.slice(marker + "uploads/".length)
        : normalized.split("/").pop();

    return relative.replace(/^\/+/, "");
};

export const attachmentName = (value) => {
    const path = attachmentPath(value);
    if (!path) return "";
    try {
        return decodeURIComponent(path.split("/").pop());
    } catch {
        return path.split("/").pop();
    }
};

export const hasAttachment = (value) => Boolean(attachmentPath(value));

// Opens (or downloads) an attachment in a new tab.
export const openAttachment = async (value, { download = false } = {}) => {
    const path = attachmentPath(value);
    if (!path) return;

    if (/^(https?:|blob:|data:)/i.test(path)) {
        window.open(path, "_blank", "noopener,noreferrer");
        return;
    }

    // Open the tab right away (inside the click) so pop-up blockers allow it.
    const tab = download ? null : window.open("", "_blank");
    if (tab) {
        tab.document.title = "Opening attachment…";
        tab.document.body.style.cssText = "margin:0;display:grid;place-items:center;height:100vh;font-family:Segoe UI,Arial,sans-serif;color:#4b4f72;background:#f6f4ff";
        tab.document.body.textContent = "Opening attachment…";
    }

    try {
        const response = await axios.get("/api/files", {
            params: { path },
            responseType: "blob",
        });
        const url = URL.createObjectURL(response.data);

        if (download || !tab) {
            const link = document.createElement("a");
            link.href = url;
            link.download = attachmentName(path) || "attachment";
            document.body.appendChild(link);
            link.click();
            link.remove();
        } else {
            tab.location.href = url;
        }
        setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    } catch (error) {
        if (tab) tab.close();
        const status = error?.response?.status;
        alert(
            status === 404
                ? "This attachment file could not be found on the server."
                : status === 401
                    ? "Please log in again to open this attachment."
                    : "Unable to open the attachment."
        );
    }
};
