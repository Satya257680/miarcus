function safeRelativePath(value) {
    const raw = String(value || "").trim();
    if (!raw || raw.length > 1000) return null;

    let decoded;
    try {
        decoded = decodeURIComponent(raw).replace(/\\/g, "/");
    } catch (_) {
        return null;
    }

    if (
        decoded.includes("\0") ||
        decoded.startsWith("/") ||
        decoded.includes("../") ||
        decoded.includes("..\\") ||
        decoded.split("/").some((part) => !part || part === "." || part === ".." || part.startsWith("."))
    ) {
        return null;
    }

    if (!/^[A-Za-z0-9._/-]+$/.test(decoded)) return null;
    return decoded;
}

const safeFilename = (value) => {
    const normalized = safeRelativePath(value);
    return normalized && !normalized.includes("/") ? normalized : null;
};

module.exports = { safeFilename, safeRelativePath };
