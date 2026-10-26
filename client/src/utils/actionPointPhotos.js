// ======================================================
// TAKE ACTION PHOTO HELPERS (shared by the Action Points page
// and components/actionPoints/TakeActionPhotos.jsx)
// ======================================================

export const MAX_ACTION_PHOTOS = 5;
const MAX_EDGE = 1600; // px – keeps phone photos small and fast to upload
const JPEG_QUALITY = 0.82;
const SUPPORTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const loadImage = (file) =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Unable to read this image."));
        };
        img.src = url;
    });

// Resizes and converts to JPEG (also turns iPhone HEIC into JPEG on
// browsers that can decode it). Falls back to the original file when
// it cannot be re-encoded but is already a server-supported image.
export const compressPhoto = async (file) => {
    try {
        const img = await loadImage(file);
        const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
        if (!blob) throw new Error("Compression failed");
        const base = String(file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
        return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
    } catch (error) {
        if (SUPPORTED.includes(String(file.type).toLowerCase())) return file;
        throw error;
    }
};

// Is a photo required for this Next Action under the Admin rule?
export const isPhotoRequired = (settings, status) =>
    Number(settings?.photo_mandatory) === 1 &&
    (settings?.mandatory_scope === "all" || status === "Closed");

const parseNewData = (item) => {
    let data = item?.new_data;
    if (typeof data === "string") {
        try {
            data = JSON.parse(data);
        } catch {
            data = null;
        }
    }
    return data && typeof data === "object" ? data : null;
};

export const historyPhotos = (item) => {
    const data = parseNewData(item);
    return Array.isArray(data?.action_photos) ? data.action_photos.filter(Boolean) : [];
};

export const historyActionTaken = (item) => {
    const data = parseNewData(item);
    return data?.action_taken ? String(data.action_taken) : "";
};
