// ======================================================
// MI ARCUS – DAILY COLLECTION EMAILS
// ======================================================
//
// Four premium, mobile-first emails (see Settings → Daily
// Collection Email Routing):
//
//   1. buildAdminSummaryEmail  – ONE summary to the selected
//      administrators: total / submitted / pending / blocked
//      stores and the list of pending stores.
//   2. buildPendingEmail       – to the store manager of every
//      store that has not submitted (still pending).
//   3. buildBlockedEmail       – to the store manager when the
//      module is automatically blocked after 12 hours.
//   4. buildReadyEmail         – to the store manager when an
//      administrator restores (unblocks) access.
//
// Email-client safe: table layout + inline styles. Every
// illustration / icon is embedded as an inline CID attachment
// from server/public/images/email (dc-*.png / dc-*.jpg).
// ======================================================

const fs = require("fs");
const path = require("path");
const { getAppUrl } = require("../../config/appUrl");

const ASSET_DIR = path.join(__dirname, "../../public/images/email");
const FONT = "'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const NAVY = "#1e1b6e";
const TEXT = "#2b2f6b";
const MUTED = "#5b6390";
const PRIMARY = "#5b3df5";

const esc = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// ------------------------------------------------------
// Inline image registry (png / jpg). A missing file never
// blocks the email — it is simply left out.
// ------------------------------------------------------
const createRegistry = () => {
    const used = new Map();

    const resolve = (name) => {
        for (const ext of ["png", "jpg"]) {
            const file = path.join(ASSET_DIR, `${name}.${ext}`);
            if (fs.existsSync(file)) return { file, ext };
        }
        return null;
    };

    const img = (name, width, height, alt = "", style = "") => {
        used.set(name, true);
        return `<img src="cid:${name}@miarcus-dc" width="${width}"${height ? ` height="${height}"` : ""} alt="${esc(alt)}" style="display:block;border:0;outline:none;text-decoration:none;max-width:100%;${height ? "" : "height:auto;"}${style}">`;
    };

    const attachments = () => {
        const list = [];
        for (const name of used.keys()) {
            const found = resolve(name);
            if (!found) {
                console.warn(`[Daily Collection Email] Asset missing: ${name}`);
                continue;
            }
            try {
                list.push({
                    filename: `${name}.${found.ext}`,
                    contentType: found.ext === "jpg" ? "image/jpeg" : "image/png",
                    content: fs.readFileSync(found.file),
                    cid: `${name}@miarcus-dc`,
                    disposition: "inline"
                });
            } catch (error) {
                console.warn(`[Daily Collection Email] Asset unreadable: ${name}`, error.message);
            }
        }
        return list;
    };

    return { img, attachments };
};

// ------------------------------------------------------
// Date helpers (Asia/Kolkata)
// ------------------------------------------------------
const toDate = (value) => {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00+05:30`);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const formatDay = (value) => new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric"
}).format(toDate(value)).replace("Sept", "Sep");

const formatTime = (value = new Date()) => new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true
}).format(value instanceof Date ? value : new Date(value));

// ------------------------------------------------------
// Shared building blocks
// ------------------------------------------------------
const shell = (inner, preheader = "") => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>MIARCUS</title>
<style>
  @media only screen and (max-width:620px){
    .dc-wrap{width:100% !important;}
    .dc-pad{padding-left:18px !important;padding-right:18px !important;}
    .dc-stack{display:block !important;width:100% !important;}
    .dc-hide{display:none !important;}
    .dc-h1{font-size:24px !important;line-height:30px !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#eef0fb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0fb;background-image:linear-gradient(180deg,#f4f2fe,#eceffb);">
  <tr>
    <td align="center" style="padding:28px 12px;">
      <table role="presentation" class="dc-wrap" width="600" cellpadding="0" cellspacing="0" border="0"
        style="width:600px;max-width:600px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 18px 50px rgba(76,59,196,0.14);">
        ${inner}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

const header = (img, when) => `
<tr>
  <td class="dc-pad" style="padding:26px 32px 8px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="middle" width="66" style="width:66px;">${img("dc-logo", 58, 58, "mi arcus", "border-radius:14px;")}</td>
        <td valign="middle" style="padding-left:14px;font-family:${FONT};">
          <div style="font-size:22px;line-height:26px;font-weight:800;color:${NAVY};letter-spacing:0.5px;">MIARCUS</div>
          <div style="font-size:13px;line-height:18px;color:${MUTED};">Retail operations, all in one place</div>
        </td>
        <td valign="middle" align="right" style="font-family:${FONT};font-size:13px;line-height:19px;color:${MUTED};white-space:nowrap;">
          ${esc(formatDay(when))}<br>${esc(formatTime(when))}
        </td>
      </tr>
    </table>
  </td>
</tr>`;

const greeting = ({ hello, sub, lines }) => `
<tr>
  <td class="dc-pad" style="padding:18px 32px 0 32px;font-family:${FONT};">
    <div class="dc-h1" style="font-size:28px;line-height:34px;font-weight:800;color:${NAVY};">${esc(hello)}</div>
    ${sub ? `<div style="font-size:16px;line-height:23px;color:${TEXT};margin-top:2px;">${esc(sub)}</div>` : ""}
    <div style="font-size:18px;line-height:27px;color:${TEXT};margin-top:12px;">${lines}</div>
  </td>
</tr>`;

const heroImage = (img, name, width, height) => `
<tr>
  <td align="center" style="padding:14px 24px 0 24px;">
    ${img(name, width, height, "", "border-radius:18px;margin:0 auto;")}
  </td>
</tr>`;

const statusCard = (img, { icon, iconSize = 64, tag, tagColor, tagBg, title, subtitle, bg, border }) => `
<tr>
  <td class="dc-pad" style="padding:16px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:${bg};border:1px solid ${border};border-radius:16px;">
      <tr>
        <td valign="middle" width="${iconSize + 30}" style="width:${iconSize + 30}px;padding:16px 0 16px 20px;">${img(icon, iconSize, iconSize, "")}</td>
        <td valign="middle" style="padding:16px 18px 16px 12px;font-family:${FONT};">
          <span style="display:inline-block;font-size:14px;line-height:20px;font-weight:700;color:${tagColor};background:${tagBg};padding:${tagBg === "transparent" ? "0" : "3px 12px"};border-radius:8px;">${esc(tag)}</span>
          <div style="font-size:22px;line-height:28px;font-weight:800;color:${NAVY};margin-top:4px;">${esc(title)}</div>
          <div style="font-size:16px;line-height:22px;color:${TEXT};">${esc(subtitle)}</div>
        </td>
      </tr>
    </table>
  </td>
</tr>`;

const paragraph = (html) => `
<tr>
  <td class="dc-pad" style="padding:16px 32px 0 32px;font-family:${FONT};font-size:16px;line-height:25px;color:${TEXT};">${html}</td>
</tr>`;

const button = (img, label, link) => `
<tr>
  <td class="dc-pad" align="center" style="padding:20px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" bgcolor="${PRIMARY}" style="border-radius:12px;background:${PRIMARY};background-image:linear-gradient(90deg,#6a3cf6,#4f46e5);">
          <a href="${esc(link)}" target="_blank"
            style="display:block;padding:16px 18px;font-family:${FONT};font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">
            &#128279;&nbsp; ${esc(label)} &nbsp;&#8594;
          </a>
        </td>
      </tr>
    </table>
    <div style="font-family:${FONT};font-size:14px;line-height:20px;margin-top:10px;">
      <a href="${esc(link)}" target="_blank" style="color:#3b2fd6;text-decoration:underline;">${esc(link)}</a>
    </div>
  </td>
</tr>`;

const noteBox = (img, { icon, iconSize = 46, title, html, bg = "#f1f0fd", border = "#e6e3fb" }) => `
<tr>
  <td class="dc-pad" style="padding:16px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:${bg};border:1px solid ${border};border-radius:14px;">
      <tr>
        <td valign="middle" width="${iconSize + 28}" style="width:${iconSize + 28}px;padding:14px 0 14px 18px;">${img(icon, iconSize, iconSize, "")}</td>
        <td valign="middle" style="padding:14px 18px 14px 10px;font-family:${FONT};font-size:15px;line-height:22px;color:${TEXT};">
          ${title ? `<div style="font-size:18px;line-height:24px;font-weight:800;color:${NAVY};margin-bottom:2px;">${esc(title)}</div>` : ""}
          ${html}
        </td>
      </tr>
    </table>
  </td>
</tr>`;

const signOff = (img) => `
<tr>
  <td class="dc-pad" style="padding:24px 32px 6px 32px;font-family:${FONT};font-size:16px;line-height:23px;color:${TEXT};">
    Thank you,<br>
    <b style="color:${NAVY};">MIARCUS Team</b><br>
    <span style="font-size:14px;color:${MUTED};">Retail operations, all in one place</span>
  </td>
</tr>
<tr>
  <td align="center" style="padding:0;">
    ${img("dc-footer", 600, 0, "MIARCUS", "width:100%;")}
  </td>
</tr>
<tr>
  <td align="center" style="padding:6px 24px 18px 24px;font-family:${FONT};font-size:12px;line-height:18px;color:#8a90b8;">
    <a href="${esc(getAppUrl())}" target="_blank" style="color:#6b62d9;text-decoration:none;">${esc(getAppUrl().replace(/^https?:\/\//, ""))}</a>
  </td>
</tr>`;

const collectionLink = () => `${getAppUrl()}/daily-collection`;

// ======================================================
// 1. ADMIN SUMMARY
// stats: { total, submitted, pending, blocked }
// pendingStores: [{ store_code, store_name, manager_name, status }]
// ======================================================
const buildAdminSummaryEmail = ({ reportDate, stats, pendingStores = [], deadlineLabel = "12:00 PM", when = new Date() }) => {
    const { img, attachments } = createRegistry();
    const shown = pendingStores.slice(0, 25);
    const more = Math.max(0, pendingStores.length - shown.length);

    const statTile = (icon, value, label, bg, color) => `
      <td valign="top" width="25%" class="dc-stack" style="width:25%;padding:0 5px 10px 5px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg};border-radius:14px;">
          <tr><td align="center" style="padding:16px 6px 4px 6px;">${img(icon, 38, 38, "", "margin:0 auto;")}</td></tr>
          <tr><td align="center" style="font-family:${FONT};font-size:30px;line-height:36px;font-weight:800;color:${color};">${esc(value)}</td></tr>
          <tr><td align="center" style="padding:0 6px 16px 6px;font-family:${FONT};font-size:14px;line-height:19px;color:${TEXT};">${esc(label)}</td></tr>
        </table>
      </td>`;

    const statusPill = (status) => {
        const blocked = String(status || "").toLowerCase() === "locked";
        return `<span style="display:inline-block;font-size:12px;line-height:18px;font-weight:700;padding:2px 10px;border-radius:7px;${blocked ? "color:#dc2626;background:#fde8e8;" : "color:#ea7a0c;background:#fff1dc;"}">${blocked ? "Blocked" : "Pending"}</span>`;
    };

    const rows = shown.map((store, index) => `
      <tr>
        <td style="padding:9px 8px;border-top:1px solid #eceef8;font-family:${FONT};font-size:13px;color:${TEXT};">${index + 1}</td>
        <td style="padding:9px 8px;border-top:1px solid #eceef8;font-family:${FONT};font-size:13px;color:${TEXT};">${esc(store.store_code || "-")}</td>
        <td style="padding:9px 8px;border-top:1px solid #eceef8;font-family:${FONT};font-size:13px;color:${TEXT};">${esc(store.store_name || "-")}</td>
        <td class="dc-hide" style="padding:9px 8px;border-top:1px solid #eceef8;font-family:${FONT};font-size:13px;color:${TEXT};">${esc(store.manager_name || "-")}</td>
        <td align="right" style="padding:9px 8px;border-top:1px solid #eceef8;">${statusPill(store.status)}</td>
      </tr>`).join("");

    const pendingTable = pendingStores.length ? `
<tr>
  <td class="dc-pad" style="padding:8px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e6e8f5;border-radius:14px;">
      <tr>
        <td style="padding:14px 16px 8px 16px;font-family:${FONT};font-size:19px;line-height:24px;font-weight:800;color:${NAVY};">Pending Stores (${pendingStores.length})</td>
        <td align="right" style="padding:14px 16px 8px 16px;">
          <a href="${esc(collectionLink())}" target="_blank" style="display:inline-block;font-family:${FONT};font-size:14px;font-weight:600;color:#3b2fd6;text-decoration:none;border:1px solid #c9c4f6;border-radius:9px;padding:6px 12px;">View All &#8594;</a>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0 8px 8px 8px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr style="background:#f5f6fc;">
              <th align="left" style="padding:9px 8px;font-family:${FONT};font-size:12px;color:${MUTED};font-weight:600;">#</th>
              <th align="left" style="padding:9px 8px;font-family:${FONT};font-size:12px;color:${MUTED};font-weight:600;">Store Code</th>
              <th align="left" style="padding:9px 8px;font-family:${FONT};font-size:12px;color:${MUTED};font-weight:600;">Store Name</th>
              <th align="left" class="dc-hide" style="padding:9px 8px;font-family:${FONT};font-size:12px;color:${MUTED};font-weight:600;">Manager</th>
              <th align="right" style="padding:9px 8px;font-family:${FONT};font-size:12px;color:${MUTED};font-weight:600;">Status</th>
            </tr>
            ${rows}
            ${more ? `<tr><td style="padding:9px 8px;border-top:1px solid #eceef8;font-family:${FONT};font-size:13px;color:${MUTED};">…</td><td colspan="4" style="padding:9px 8px;border-top:1px solid #eceef8;font-family:${FONT};font-size:13px;color:${MUTED};">+${more} more store${more === 1 ? "" : "s"} not shown</td></tr>` : ""}
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>` : paragraph(`<div style="background:#e9f9ef;border:1px solid #c9eed6;border-radius:14px;padding:14px 18px;color:#137a3d;font-weight:700;">&#127881; Every store has submitted its Daily Collection. Great work!</div>`);

    const inner = `
${header(img, when)}
<tr>
  <td class="dc-pad" style="padding:10px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#f6f4ff;background-image:linear-gradient(110deg,#ffffff 0%,#f4f1ff 55%,#ece8ff 100%);border-radius:18px;">
      <tr>
        <td valign="middle" style="padding:22px 10px 22px 22px;font-family:${FONT};">
          <div class="dc-h1" style="font-size:26px;line-height:32px;font-weight:800;color:${NAVY};">Hello Administrator,</div>
          <div style="font-size:17px;line-height:25px;color:${TEXT};margin-top:8px;">Here is today's Daily Collection submission summary for <b>${esc(formatDay(reportDate))}</b>.</div>
        </td>
        <td valign="bottom" align="right" width="230" class="dc-hide" style="width:230px;padding:0;">${img("dc-hero-summary", 230, 226, "", "border-bottom-right-radius:18px;")}</td>
      </tr>
    </table>
  </td>
</tr>
<tr>
  <td class="dc-pad" style="padding:16px 27px 0 27px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        ${statTile("dc-i-store", stats.total, "Total Stores", "#eef3ff", "#1d4ed8")}
        ${statTile("dc-i-check", stats.submitted, "Submitted", "#eafaf0", "#15a34a")}
        ${statTile("dc-i-clock", stats.pending, "Pending", "#fff5e6", "#ea7a0c")}
        ${statTile("dc-i-lock", stats.blocked, "Blocked", "#fdeeee", "#dc2626")}
      </tr>
    </table>
  </td>
</tr>
${pendingTable}
${pendingStores.length ? noteBox(img, {
        icon: "dc-clock-orange",
        iconSize: 52,
        bg: "#fff4ef",
        border: "#fde3d6",
        html: `If these stores do not submit within 12 hours (i.e. by ${esc(deadlineLabel)}), their Daily Collection module will be automatically blocked.`
    }) : ""}
${button(img, pendingStores.length ? "View Pending Stores on MIARCUS Portal" : "Open Daily Collection on MIARCUS Portal", collectionLink())}
${signOff(img)}`;

    return {
        subject: `Daily Collection Summary — ${formatDay(reportDate)}: ${stats.submitted} submitted, ${stats.pending} pending`,
        html: shell(inner, `${stats.submitted} of ${stats.total} stores submitted. ${stats.pending} pending, ${stats.blocked} blocked.`),
        attachments: attachments()
    };
};

// ======================================================
// 2. PENDING REMINDER (store manager)
// ======================================================
const buildPendingEmail = ({ managerName, storeName, storeCode, city, reportDate, deadlineLabel = "12:00 PM", when = new Date() }) => {
    const { img, attachments } = createRegistry();
    const storeLine = [storeName, city].filter(Boolean).join(", ") + (storeCode ? ` - ${storeCode}` : "");

    const inner = `
${header(img, when)}
${greeting({
        hello: `Hello ${managerName || "Store Manager"},`,
        sub: storeLine ? `(${storeLine})` : "",
        lines: `Your Daily Collection for ${esc(formatDay(reportDate))} is <b style="color:#e11d2e;">still pending.</b>`
    })}
${heroImage(img, "dc-hero-pending", 520, 250)}
${statusCard(img, {
        icon: "dc-calendar",
        tag: "Pending Submission",
        tagColor: "#e11d2e",
        tagBg: "#fde2e4",
        title: formatDay(reportDate),
        subtitle: "Daily Collection",
        bg: "#fff4f5",
        border: "#fbe1e4"
    })}
${paragraph("Please submit your Daily Collection at the earliest to avoid access restriction.")}
${button(img, "Open Daily Collection on MIARCUS Portal", collectionLink())}
${noteBox(img, { icon: "dc-info", html: `If you do not submit within 12 hours (i.e. by ${esc(deadlineLabel)}), your Daily Collection module will be automatically blocked.` })}
${noteBox(img, { icon: "dc-headset", title: "Need Help?", html: "Contact your administrator or support team for assistance." })}
${signOff(img)}`;

    return {
        subject: `Reminder: Daily Collection pending — ${storeName || "your store"} (${formatDay(reportDate)})`,
        html: shell(inner, `Your Daily Collection for ${formatDay(reportDate)} is still pending.`),
        attachments: attachments()
    };
};

// ======================================================
// 3. MODULE BLOCKED (store manager)
// ======================================================
const buildBlockedEmail = ({ managerName, storeName, storeCode, city, reportDate, blockedAt = new Date(), reason = "No submission within 12 hours", when = new Date() }) => {
    const { img, attachments } = createRegistry();
    const storeLine = [storeName, city].filter(Boolean).join(", ") + (storeCode ? ` - ${storeCode}` : "");

    const row = (label, value) => `
      <tr>
        <td valign="top" width="130" style="width:130px;padding:3px 0;font-family:${FONT};font-size:15px;line-height:21px;color:${TEXT};">${esc(label)}</td>
        <td valign="top" style="padding:3px 0;font-family:${FONT};font-size:15px;line-height:21px;color:${TEXT};">: ${esc(value)}</td>
      </tr>`;

    const inner = `
${header(img, when)}
${greeting({
        hello: `Hello ${managerName || "Store Manager"},`,
        sub: storeLine ? `(${storeLine})` : "",
        lines: `Your Daily Collection module has been <b style="color:#e11d2e;">automatically blocked.</b>`
    })}
${heroImage(img, "dc-hero-blocked", 520, 257)}
${statusCard(img, {
        icon: "dc-lock-tile",
        tag: "Module Blocked",
        tagColor: "#e11d2e",
        tagBg: "transparent",
        title: "Daily Collection",
        subtitle: formatDay(reportDate),
        bg: "#fff1f2",
        border: "#fbdadd"
    })}
${paragraph("You did not submit your Daily Collection within the allowed 12 hours. Your access is now restricted.")}
<tr>
  <td class="dc-pad" style="padding:16px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff1f2;border:1px solid #fbdadd;border-radius:14px;">
      <tr>
        <td valign="top" width="74" style="width:74px;padding:16px 0 16px 18px;">${img("dc-clock-red", 48, 48, "")}</td>
        <td valign="top" style="padding:14px 18px 14px 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${row("Collection Date", formatDay(reportDate))}
            ${row("Blocked At", formatTime(blockedAt))}
            ${row("Reason", reason)}
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>
${noteBox(img, { icon: "dc-headset", html: "To re-activate your Daily Collection module, please contact the administrator." })}
${button(img, "Contact Administrator", getAppUrl())}
${signOff(img)}`;

    return {
        subject: `Daily Collection blocked — ${storeName || "your store"} (${formatDay(reportDate)})`,
        html: shell(inner, `Your Daily Collection module for ${formatDay(reportDate)} has been blocked.`),
        attachments: attachments()
    };
};

// ======================================================
// 4. MODULE RE-ACTIVATED (store manager)
// ======================================================
const buildReadyEmail = ({ managerName, storeName, storeCode, city, reportDate, when = new Date() }) => {
    const { img, attachments } = createRegistry();
    const storeLine = [storeName, city].filter(Boolean).join(", ") + (storeCode ? ` - ${storeCode}` : "");

    const inner = `
${header(img, when)}
${greeting({
        hello: `Hello ${managerName || "Store Manager"},`,
        sub: storeLine ? `(${storeLine})` : "",
        lines: `Your <b style="color:${NAVY};">Daily Collection module is now</b> <b style="color:#15a34a;">ready for submission.</b>`
    })}
${heroImage(img, "dc-hero-ready", 500, 324)}
${statusCard(img, {
        icon: "dc-check-tile",
        iconSize: 70,
        tag: "Module Re-activated",
        tagColor: "#15a34a",
        tagBg: "transparent",
        title: "Daily Collection",
        subtitle: formatDay(reportDate),
        bg: "#effbf3",
        border: "#cdeed9"
    })}
${paragraph("Your access has been restored by the administrator. You can now submit your Daily Collection.")}
${button(img, "Open Daily Collection on MIARCUS Portal", collectionLink())}
${noteBox(img, { icon: "dc-info", html: "If you face any issue, please contact your administrator or support team." })}
${signOff(img)}`;

    return {
        subject: `Daily Collection is ready for submission — ${storeName || "your store"} (${formatDay(reportDate)})`,
        html: shell(inner, "Your Daily Collection module has been re-activated."),
        attachments: attachments()
    };
};

module.exports = {
    buildAdminSummaryEmail,
    buildPendingEmail,
    buildBlockedEmail,
    buildReadyEmail,
    formatDay
};
