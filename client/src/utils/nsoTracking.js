// ======================================================
// NSO TRACKING HELPERS
//
// NSO Tracking shows every New Store Opening project with
// a store code, region, planned / opening date, a normalised
// status (Completed / In Progress / Planning / Delayed) and
// a progress % calculated from the project milestones.
// ======================================================

import { hasModuleLevel, isAdministratorUser } from "./rbac";

export const MILESTONES = [
    ["Layout By NSO", "layout_by_nso"],
    ["Revised Layout", "revised_layout_by_nso"],
    ["Approval", "approval_deadline"],
    ["Visit By OP", "visit_by_op_team"],
    ["GST", "gst_deadline"],
    ["HR Hiring", "hr_hiring_deadline"],
    ["Team Training", "team_training_deadline"],
    ["NSO Visit", "visit_by_nso_team_deadline"],
    ["Plan Of Stock", "plan_of_stock_deadline"],
    ["Collaterals", "plan_of_collaterals_deadline"],
    ["Field Training", "on_field_training_deadline"],
    ["Dispatch", "dispatch_stock_deadline"],
    ["NSO Handover", "nso_handover_deadline"],
    ["VM Handover", "vm_handover_deadline"],
    ["Scanning", "scanning_deadline"],
    ["Billing / Opening", "billing_start_date"],
];

export const STATUS_OPTIONS = [
    "Planning",
    "Layout Pending",
    "Approval Pending",
    "Construction",
    "Training",
    "Ready For Opening",
    "Opened",
    "Completed",
    "On Hold",
    "Cancelled",
];

const STATUS_PROGRESS = {
    planning: 10,
    "layout pending": 22,
    "approval pending": 36,
    construction: 55,
    training: 70,
    "ready for opening": 88,
    opened: 100,
    completed: 100,
};

export const REGIONS = ["North", "South", "East", "West", "Central", "North East"];

// Major Indian cities / states → region.
const REGION_MAP = {
    North: [
        "delhi", "new delhi", "gurgaon", "gurugram", "noida", "greater noida", "ghaziabad", "faridabad",
        "chandigarh", "mohali", "panchkula", "ludhiana", "amritsar", "jalandhar", "patiala", "dehradun",
        "haridwar", "rishikesh", "shimla", "manali", "jammu", "srinagar", "katra", "lucknow", "kanpur",
        "agra", "varanasi", "prayagraj", "allahabad", "meerut", "aligarh", "bareilly", "moradabad",
        "jaipur", "jodhpur", "udaipur", "ajmer", "kota", "bikaner", "sonipat", "panipat", "karnal",
        "ambala", "rohtak", "hisar", "haryana", "punjab", "uttar pradesh", "uttarakhand", "himachal pradesh",
        "jammu and kashmir", "rajasthan", "ladakh", "leh",
    ],
    South: [
        "bangalore", "bengaluru", "chennai", "hyderabad", "secunderabad", "kochi", "cochin", "trivandrum",
        "thiruvananthapuram", "coimbatore", "madurai", "mysore", "mysuru", "mangalore", "mangaluru",
        "vijayawada", "visakhapatnam", "vizag", "tirupati", "pondicherry", "puducherry", "calicut",
        "kozhikode", "trichy", "salem", "hubli", "belgaum", "warangal", "karnataka", "tamil nadu", "kerala",
        "andhra pradesh", "telangana",
    ],
    East: [
        "kolkata", "howrah", "bhubaneswar", "cuttack", "patna", "ranchi", "jamshedpur", "dhanbad",
        "siliguri", "durgapur", "asansol", "gaya", "west bengal", "odisha", "orissa", "bihar", "jharkhand",
    ],
    West: [
        "mumbai", "navi mumbai", "thane", "pune", "nagpur", "nashik", "aurangabad", "ahmedabad", "surat",
        "vadodara", "baroda", "rajkot", "gandhinagar", "goa", "panaji", "margao", "kolhapur", "solapur",
        "maharashtra", "gujarat",
    ],
    Central: [
        "bhopal", "indore", "gwalior", "jabalpur", "ujjain", "raipur", "bilaspur", "bhilai",
        "madhya pradesh", "chhattisgarh",
    ],
    "North East": [
        "guwahati", "shillong", "imphal", "agartala", "aizawl", "kohima", "itanagar", "gangtok",
        "assam", "meghalaya", "manipur", "tripura", "mizoram", "nagaland", "arunachal pradesh", "sikkim",
    ],
};

const lookup = (() => {
    const map = new Map();
    Object.entries(REGION_MAP).forEach(([region, list]) => list.forEach((name) => map.set(name, region)));
    return map;
})();

export const regionFor = (project = {}) => {
    const explicit = String(project.region || "").trim();
    if (explicit) return explicit;
    const candidates = [project.city, project.state, project.location];
    for (const value of candidates) {
        const text = String(value || "").toLowerCase().trim();
        if (!text) continue;
        if (lookup.has(text)) return lookup.get(text);
        for (const [name, region] of lookup.entries()) {
            if (text.includes(name)) return region;
        }
    }
    return "-";
};

export const storeCode = (project = {}) =>
    String(project.store_code || project.code || `NSO-${String(project.id || 0).padStart(3, "0")}`);

export const storeName = (project = {}) =>
    String(project.store_name || project.location || "New Store");

const IST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

export const toYmd = (value) => {
    if (!value) return "";
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : IST.format(value);
    // MySQL DATE values serialised as UTC timestamps ("2025-10-14T18:30:00.000Z")
    // belong to the Indian calendar day.
    if (/T\d{2}:\d{2}.*(Z|[+-]\d{2}:?\d{2})$/.test(String(value))) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) return IST.format(date);
    }
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

export const todayYmd = () => IST.format(new Date());

export const formatDate = (value) => {
    const ymd = toYmd(value);
    if (!ymd) return "-";
    const [y, m, d] = ymd.split("-");
    return `${d}-${m}-${y}`;
};

export const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

export const plannedDate = (project = {}) => toYmd(project.billing_start_date) || "";

export const isCompletedStatus = (status) =>
    ["completed", "opened"].includes(String(status || "").toLowerCase());

export const openingDate = (project = {}) =>
    isCompletedStatus(project.status) ? toYmd(project.billing_start_date) || toYmd(project.updated_at) : "";

// Completed / In Progress / Planning / Delayed / On Hold / Cancelled
export const trackingStatus = (project = {}) => {
    const raw = String(project.status || "Planning").trim().toLowerCase();
    if (isCompletedStatus(raw)) return "Completed";
    if (raw === "cancelled") return "Cancelled";
    if (raw === "on hold") return "On Hold";
    const planned = plannedDate(project);
    if (planned && planned < todayYmd()) return "Delayed";
    if (raw === "planning" || !raw) return "Planning";
    return "In Progress";
};

export const milestoneState = (project = {}) => {
    const today = todayYmd();
    return MILESTONES.map(([label, field]) => {
        const date = toYmd(project[field]);
        return { label, field, date, done: Boolean(date && date <= today) };
    });
};

export const progressFor = (project = {}) => {
    if (isCompletedStatus(project.status)) return 100;
    const byStatus = STATUS_PROGRESS[String(project.status || "").toLowerCase()] ?? 5;
    const items = milestoneState(project).filter((item) => item.date);
    if (!items.length) return byStatus;
    const done = items.filter((item) => item.done).length;
    const byMilestones = Math.round((done / MILESTONES.length) * 100);
    return Math.min(99, Math.max(byMilestones, byStatus));
};

export const STATUS_TONE = {
    Completed: "green",
    "In Progress": "amber",
    Planning: "violet",
    Delayed: "red",
    "On Hold": "gray",
    Cancelled: "gray",
};

export const progressTone = (value, status) => {
    if (status === "Completed" || value >= 100) return "green";
    if (status === "Delayed") return "red";
    if (status === "Planning" || value < 30) return "blue";
    return "amber";
};

export const attachmentUrl = (baseUrl, value) => {
    const path = String(value || "").trim();
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `${String(baseUrl || "").replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
};

export const nsoPermissions = () => {
    const admin = isAdministratorUser();
    const level = (required) => admin || hasModuleLevel("New Store Openings", required);
    return {
        canView: level("View"),
        canAdd: level("Add"),
        canEdit: level("Edit"),
        canDelete: level("Full"),
    };
};

export const unwrapProject = (response) => {
    const body = response?.data ?? response;
    if (body?.data && !Array.isArray(body.data)) return body.data;
    if (Array.isArray(body?.data)) return body.data[0] || null;
    return body || null;
};

export const unwrapList = (response) => {
    const body = response?.data ?? response;
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.rows)) return body.rows;
    return [];
};
