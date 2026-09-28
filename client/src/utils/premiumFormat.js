// ======================================================
// Small formatting helpers shared by the premium pages.
// ======================================================

// Parse "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss", ISO strings or Date
// into a local calendar date (midnight) without timezone drift.
export function toLocalDate(value) {
    if (!value) return null;

    if (value instanceof Date) {
        return Number.isNaN(value.getTime())
            ? null
            : new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

    const text = String(value).trim();
    // Same rule the tables already use: the leading YYYY-MM-DD is the
    // calendar date (avoids MySQL DATE → UTC ISO shifting a day).
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    const parsed = new Date(text);

    if (Number.isNaN(parsed.getTime())) return null;

    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

// Whole days between today and the given date (negative = past).
export function daysFromToday(value) {
    const date = toLocalDate(value);

    if (!date) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return Math.round((date.getTime() - today.getTime()) / 86400000);
}

export function initials(name = "") {
    const parts = String(name || "")
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 0) return "–";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_TONES = ["", "teal", "amber", "rose", "blue"];

// Stable colour per name so the same person always gets the same avatar.
export function avatarTone(name = "") {
    const text = String(name || "");
    let hash = 0;

    for (let i = 0; i < text.length; i += 1) {
        hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }

    const tone = AVATAR_TONES[hash % AVATAR_TONES.length];

    return tone ? `pp-avatar--${tone}` : "";
}

export function formatCount(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return "0";

    return number.toLocaleString("en-IN");
}
