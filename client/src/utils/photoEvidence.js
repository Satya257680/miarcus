// ==========================================================
// PHOTO EVIDENCE HELPERS
// Shared by the checklist per-question photo picker.
// ==========================================================

let photoSeq = 0;
export const newPhotoId = () => `qp-${Date.now().toString(36)}-${(photoSeq += 1)}`;

const MAX_SIDE = 1600;
const ALLOWED_UPLOAD = /\.(jpe?g|png|gif|webp)$/i;

export const isTouchDevice = () =>
    typeof window !== "undefined" &&
    (window.matchMedia?.("(pointer: coarse)").matches || "ontouchstart" in window);

export const loadImage = (src) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

// Resize + re-encode as JPEG. Falls back to the original file for
// small, already-supported images when the browser can't decode.
export async function compressImage(file) {
    const objectUrl = URL.createObjectURL(file);
    try {
        const img = await loadImage(objectUrl);
        const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
        if (!blob) throw new Error("encode failed");
        const base = (file.name || "photo").replace(/\.[^.]+$/, "") || "photo";
        return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
    } catch {
        if (ALLOWED_UPLOAD.test(file.name || "")) return file;
        throw new Error("This image format is not supported. Please use JPG, PNG or WEBP.");
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export const fileToPhoto = async (file) => {
    const compressed = await compressImage(file);
    return { id: newPhotoId(), kind: "file", file: compressed, preview: URL.createObjectURL(compressed) };
};

export const releasePhoto = (photo) => {
    if (photo?.kind === "file" && photo.preview) URL.revokeObjectURL(photo.preview);
};

