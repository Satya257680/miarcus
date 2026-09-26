// ======================================================
// MI ARCUS – PREMIUM NOTIFICATION EMAIL TEMPLATE
// ======================================================
//
// Shared layout for the "Checklist Notification" and
// "New Store Opening Notification" emails:
//
//   header (cloud logo · tagline · portal label)
//   gradient rule
//   hero (circle illustration · title · intro · decoration)
//   details card (two columns, icon + label + value)
//   … event specific blocks …
//   "View on MI ARCUS Portal" button
//   footer
//
// Email-client safe: table layout, inline styles, and every
// icon/illustration is a PNG embedded as an inline CID
// attachment (server/public/images/email/*.png). No SVG, no
// web fonts, no remote images.
// ======================================================

const fs = require("fs");
const path = require("path");
const { getAppUrl } = require("../../config/appUrl");

const ASSET_DIR = path.join(__dirname, "../../public/images/email");

// The logo uses the same CID as the global brand logo so the mailer does
// not attach the large 512px brand image a second time.
const LOGO_CID = "miarcus-logo@miarcus";

const cidFor = (name) => (name === "logo" ? LOGO_CID : `${name}@miarcus-email`);

const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// ------------------------------------------------------
// Collects the images a template uses and turns them into
// inline attachments. A missing file never blocks the email.
// ------------------------------------------------------
const createImageRegistry = () => {
    const used = new Set();

    const img = (name, width, height, alt = "", style = "") => {
        used.add(name);
        return `<img src="cid:${cidFor(name)}" width="${width}"${height ? ` height="${height}"` : ""} alt="${escapeHtml(alt)}" style="display:block;border:0;outline:none;text-decoration:none;${style}">`;
    };

    const attachments = () => {
        const list = [];
        for (const name of used) {
            const file = path.join(ASSET_DIR, `${name}.png`);
            try {
                if (!fs.existsSync(file)) {
                    console.warn(`[Email] Asset missing: ${file}`);
                    continue;
                }
                list.push({
                    filename: `${name}.png`,
                    contentType: "image/png",
                    content: fs.readFileSync(file),
                    cid: cidFor(name),
                    disposition: "inline"
                });
            } catch (error) {
                console.warn(`[Email] Asset unreadable: ${file}`, error.message);
            }
        }
        return list;
    };

    return { img, attachments };
};

// ------------------------------------------------------
// IST date helpers
// ------------------------------------------------------
const formatIST = (value = new Date()) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || "-");
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).formatToParts(date).reduce((acc, part) => ({ ...acc, [part.type]: part.value }), {});
    parts.month = String(parts.month).slice(0, 3);
    return `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}:${parts.second} (IST)`;
};

// "2026-09-25 17:54:52" stored in IST → "Fri, 25 Sep 2026, 17:54:52 (IST)"
const formatStoredIST = (value) => {
    if (!value) return "-";
    if (value instanceof Date) return formatIST(value);
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!match) return String(value);
    const [, y, m, d, hh = "00", mm = "00", ss = "00"] = match;
    // Interpret the wall-clock time as IST (+05:30).
    return formatIST(new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}+05:30`));
};

const formatShortDate = (value) => {
    if (!value) return null;
    let date;
    if (value instanceof Date) date = value;
    else {
        const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        date = match ? new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00+05:30`) : new Date(value);
    }
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric"
    }).format(date).replace("Sept", "Sep");
};

// ------------------------------------------------------
// BUILDING BLOCKS
// ------------------------------------------------------

const FONT = "'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

const header = (img, portalLine) => `
<tr>
  <td style="padding:28px 36px 18px 36px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="middle" width="120" style="width:120px;">${img("logo", 112, 67, "mi arcus")}</td>
        <td valign="middle" width="2" style="width:2px;padding:0 16px;">
          <div style="width:1px;height:52px;background:#cbd5e1;line-height:52px;font-size:0;">&nbsp;</div>
        </td>
        <td valign="middle" style="font-family:${FONT};font-size:15px;line-height:21px;color:#475569;">
          Every Store<br>A Brighter Tomorrow
        </td>
        <td valign="middle" align="right" class="mi-hide-mobile" style="font-family:${FONT};font-size:11px;line-height:20px;letter-spacing:2.6px;color:#475e8c;font-weight:600;text-transform:uppercase;">
          Store Operations Portal<br>${escapeHtml(portalLine)}
        </td>
      </tr>
    </table>
  </td>
</tr>
<tr>
  <td style="padding:0 36px;">
    <div style="height:3px;line-height:3px;font-size:0;background:#6d28d9;background-image:linear-gradient(90deg,#7c3aed,#4f46e5 55%,#0ea5e9);border-radius:3px;">&nbsp;</div>
  </td>
</tr>`;

const hero = ({ img, icon, title, accentLine, accentColor = "#16a34a", intro, decoration, decorationSize }) => `
<tr>
  <td style="padding:20px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#eef2fd;background-image:linear-gradient(100deg,#e6f0fb 0%,#eef0fd 55%,#f3ecfd 100%);border-radius:16px;">
      <tr>
        <td valign="middle" width="136" class="mi-hide-mobile" style="width:136px;padding:22px 0 22px 24px;">${img(icon, 112, 112, "")}</td>
        <td valign="middle" style="padding:22px 14px 22px 22px;font-family:${FONT};">
          <div style="font-size:28px;line-height:34px;font-weight:800;color:#0f1b3d;letter-spacing:-0.3px;">${escapeHtml(title)}</div>
          ${accentLine ? `<div style="font-size:23px;line-height:30px;font-weight:700;color:${accentColor};margin-top:2px;">${escapeHtml(accentLine)}</div>` : ""}
          <div style="font-size:15px;line-height:23px;color:#51607a;margin-top:8px;">${escapeHtml(intro)}</div>
        </td>
        ${decoration ? `<td valign="bottom" align="right" width="${decorationSize[0]}" class="mi-hide-mobile" style="width:${decorationSize[0]}px;padding:0;">${img(decoration, decorationSize[0], decorationSize[1], "", "border-bottom-right-radius:16px;")}</td>` : ""}
      </tr>
    </table>
  </td>
</tr>`;

const detailItem = (img, icon, label, valueHtml) => `
<tr>
  <td valign="middle" width="58" style="width:58px;padding:9px 0;">${img(icon, 44, 44, "")}</td>
  <td valign="middle" style="padding:9px 0 9px 8px;font-family:${FONT};">
    <div style="font-size:14px;line-height:19px;color:#5b6b8c;">${escapeHtml(label)}</div>
    <div style="font-size:16px;line-height:22px;color:#0f172a;font-weight:700;margin-top:2px;">${valueHtml}</div>
  </td>
</tr>`;

const detailsCard = (img, left, right) => `
<tr>
  <td style="padding:16px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border:1px solid #e3e8f2;border-radius:14px;background:#ffffff;">
      <tr>
        <td valign="top" width="50%" class="mi-stack mi-card-col" style="width:50%;padding:12px 18px 12px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${left.map(([icon, label, value]) => detailItem(img, icon, label, value)).join("")}
          </table>
        </td>
        <td valign="middle" width="1" class="mi-hide-mobile" style="width:1px;padding:18px 0;">
          <div style="width:1px;height:190px;background:#e3e8f2;font-size:0;line-height:0;">&nbsp;</div>
        </td>
        <td valign="top" width="50%" class="mi-stack mi-card-col" style="width:50%;padding:12px 18px 12px 30px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${right.map(([icon, label, value]) => detailItem(img, icon, label, value)).join("")}
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`;

const statCard = (img, { icon, value, valueColor, title, titleColor, sub, subColor, bg, bgImage }) => `
<table role="presentation" width="100%" height="140" cellpadding="0" cellspacing="0" border="0"
  style="height:140px;background:${bg};${bgImage ? `background-image:${bgImage};` : ""}border-radius:14px;">
  <tr>
    <td valign="middle" width="72" style="width:72px;padding:14px 0 14px 14px;">${img(icon, 60, 60, "")}</td>
    <td valign="middle" style="padding:14px 14px 14px 12px;font-family:${FONT};">
      <div style="font-size:32px;line-height:36px;font-weight:800;color:${valueColor};">${escapeHtml(value)}</div>
      <div style="font-size:15px;line-height:20px;font-weight:600;color:${titleColor};margin-top:2px;">${escapeHtml(title)}</div>
      <div style="font-size:13px;line-height:18px;color:${subColor};margin-top:2px;">${escapeHtml(sub)}</div>
    </td>
  </tr>
</table>`;

const statsRow = (img, cards) => `
<tr>
  <td style="padding:16px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        ${cards.map((card, index) => `
        <td valign="top" width="${Math.floor(100 / cards.length)}%" class="mi-stack"
          style="width:${Math.floor(100 / cards.length)}%;${index ? "padding-left:12px;" : ""}">
          ${statCard(img, card)}
        </td>`).join("")}
      </tr>
    </table>
  </td>
</tr>`;

const button = (img, link, note) => `
<tr>
  <td align="center" style="padding:22px 32px 0 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" bgcolor="#0b57e3" style="border-radius:10px;background:#0b57e3;background-image:linear-gradient(180deg,#1463f3,#0b50d6);">
          <a href="${escapeHtml(link)}" target="_blank"
            style="display:inline-block;padding:15px 44px;font-family:${FONT};font-size:18px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
            <!--[if mso]>&nbsp;<![endif]-->
            <span style="display:inline-block;vertical-align:middle;">${img("i-link", 22, 22, "", "display:inline-block;vertical-align:middle;")}</span>
            <span style="display:inline-block;vertical-align:middle;padding-left:12px;white-space:nowrap;">View on MI ARCUS Portal</span>
          </a>
        </td>
      </tr>
    </table>
    <div style="font-family:${FONT};font-size:14px;line-height:20px;color:#475569;margin-top:14px;">${escapeHtml(note)}</div>
  </td>
</tr>`;

const footer = (img) => {
    const site = getAppUrl();
    return `
<tr>
  <td style="padding:22px 36px 0 36px;">
    <div style="height:1px;line-height:1px;font-size:0;background:#dbe2ee;">&nbsp;</div>
  </td>
</tr>
<tr>
  <td style="padding:16px 36px 28px 36px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="top" class="mi-stack" style="font-family:${FONT};">
          <div style="font-size:17px;font-weight:800;letter-spacing:1.6px;color:#3b1d8f;">MI ARCUS</div>
          <div style="font-size:14px;line-height:20px;color:#64748b;margin-top:8px;">Store Operations &nbsp;|&nbsp; Brand Compliance &nbsp;|&nbsp; Growth Together</div>
        </td>
        <td valign="top" align="right" class="mi-stack" style="font-family:${FONT};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right">
            <tr>
              <td valign="middle" style="padding-right:7px;">${img("i-globe", 20, 20, "")}</td>
              <td valign="middle"><a href="${escapeHtml(site)}" target="_blank" style="font-size:15px;color:#1d4ed8;text-decoration:underline;">${escapeHtml(site)}</a></td>
            </tr>
          </table>
          <div style="clear:both;font-size:13px;line-height:19px;color:#64748b;margin-top:8px;">This is an automated email from MI ARCUS Portal.<br>Please do not reply to this email.</div>
        </td>
      </tr>
    </table>
  </td>
</tr>`;
};

const wrap = ({ title, preheader, rows }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(title)}</title>
<style>
  @media only screen and (max-width: 640px) {
    .mi-container { width:100% !important; }
    .mi-stack { display:block !important; width:100% !important; padding-left:0 !important; padding-right:0 !important; text-align:left !important; margin-top:10px; }
    .mi-hide-mobile { display:none !important; }
    .mi-card-col { padding:4px 16px !important; margin-top:0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f1f4fb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader || "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f4fb;">
  <tr>
    <td align="center" style="padding:24px 10px;">
      <table role="presentation" class="mi-container" width="760" cellpadding="0" cellspacing="0" border="0"
        style="width:760px;max-width:760px;background:#ffffff;border-radius:6px;box-shadow:0 6px 28px rgba(30,41,90,.08);">
        ${rows.join("")}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

// ======================================================
// CHECKLIST SUBMISSION EMAIL
// ======================================================
const buildChecklistSubmissionEmail = ({
    storeName,
    city,
    checklistName,
    submittedBy,
    submittedAt,
    totalQuestions,
    actionPoints,
    reportItems,
    link
}) => {
    const { img, attachments } = createImageRegistry();
    const hasIssues = Number(actionPoints) > 0;

    const rows = [
        header(img, "Checklist Notification"),
        hero({
            img,
            icon: "hero-checklist",
            title: "Checklist Submission",
            accentLine: "Successfully Completed",
            intro: "A store checklist has been submitted and is now available for review on the MI ARCUS Portal.",
            decoration: "hero-rainbow",
            decorationSize: [160, 91]
        }),
        detailsCard(
            img,
            [
                ["b-store", "Store", escapeHtml(storeName || "-")],
                ["b-pin", "City", `<span style="font-weight:500;">${escapeHtml(city || "-")}</span>`],
                ["b-list", "Checklist", escapeHtml(checklistName || "-")]
            ],
            [
                ["b-user", "Submitted By", escapeHtml(submittedBy || "-")],
                ["b-calendar", "Submission Date & Time", `<span style="font-weight:500;">${escapeHtml(submittedAt || "-")}</span>`],
                ["b-doc", "Total Questions", `<span style="font-weight:500;">${escapeHtml(totalQuestions)}</span>`]
            ]
        ),
        statsRow(img, [
            hasIssues
                ? {
                    icon: "s-warning", value: actionPoints, valueColor: "#e11d25",
                    title: actionPoints === 1 ? "Action Point Generated" : "Action Points Generated",
                    titleColor: "#e11d25", sub: "Requires your review", subColor: "#9f4150",
                    bg: "#fde8ea", bgImage: "linear-gradient(90deg,#fde2e4,#fdeef0)"
                }
                : {
                    icon: "s-ok", value: 0, valueColor: "#059669",
                    title: "Action Points", titleColor: "#047857",
                    sub: "No issues found", subColor: "#3f7a61",
                    bg: "#e3f8ee", bgImage: "linear-gradient(90deg,#dcf5e8,#ecfbf3)"
                },
            {
                icon: "s-doc", value: reportItems, valueColor: "#0f2a6b",
                title: "Checklist Report", titleColor: "#0f172a",
                sub: "Ready to review", subColor: "#64748b",
                bg: "#eaf2fd", bgImage: "linear-gradient(90deg,#e4eefc,#f0f6fe)"
            },
            {
                icon: "s-chart", value: totalQuestions, valueColor: "#2e1065",
                title: "Questions Submitted", titleColor: "#1e1b4b",
                sub: "All answers recorded", subColor: "#64748b",
                bg: "#f1ebfd", bgImage: "linear-gradient(90deg,#efe7fd,#f6f1fe)"
            }
        ]),
        button(img, link, "Please log in to the portal to review the full checklist details, action points and store reports."),
        footer(img)
    ];

    return {
        html: wrap({
            title: "Checklist Submission",
            preheader: `${storeName || "Store"} checklist submitted by ${submittedBy || "-"} · ${actionPoints} Action Point(s)`,
            rows
        }),
        attachments: attachments()
    };
};

// ======================================================
// NEW STORE OPENING EMAIL
// ======================================================
const TIMELINE_ICONS = ["t-blue", "t-purple", "t-amber", "t-gray", "t-gray", "t-gray"];

const buildNsoEmail = ({
    event = "created",
    storeName,
    city,
    status,
    dateLabel,
    dateValue,
    storeCode,
    formatLabel,
    formatValue,
    people = [],
    milestones = [],
    link
}) => {
    const { img, attachments } = createImageRegistry();
    const isUpdate = event === "updated";

    const statusPill = `<span style="display:inline-block;padding:4px 16px;border-radius:999px;background:#d8f5e3;color:#15803d;font-size:16px;font-weight:700;">${escapeHtml(status || "Planning")}</span>`;

    const peopleHtml = `
<tr>
  <td style="padding:16px 32px 0 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border:1px solid #e3e8f2;border-radius:14px;background:#ffffff;">
      <tr>
        <td style="padding:12px 18px;background:#f1f5fd;background-image:linear-gradient(90deg,#eaf0fc,#f6f8fe);border-top-left-radius:14px;border-top-right-radius:14px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle" style="padding-right:12px;">${img("i-people", 28, 28, "")}</td>
              <td valign="middle" style="font-family:${FONT};font-size:19px;font-weight:700;color:#0f1b3d;">Key Responsible People</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 6px 12px 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              ${people.map(([role, name], index) => `
              <td valign="top" align="center" width="${Math.floor(100 / people.length)}%" class="mi-stack"
                style="padding:8px 6px;${index ? "border-left:1px solid #e6ebf3;" : ""}font-family:${FONT};">
                <div style="font-size:13px;line-height:18px;color:#475569;">${escapeHtml(role)}</div>
                <div style="font-size:14px;line-height:20px;color:#0f172a;font-weight:600;margin-top:8px;">${escapeHtml(name || "-")}</div>
              </td>`).join("")}
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>`;

    let pendingIndex = 0;
    const timelineCells = milestones.map((milestone, index) => {
        const icon = milestone.done ? "t-done" : TIMELINE_ICONS[Math.min(pendingIndex++, TIMELINE_ICONS.length - 1)];
        const leftLine = index === 0 ? "transparent" : "#cfd8ea";
        const rightLine = index === milestones.length - 1 ? "transparent" : "#cfd8ea";
        return `
        <td valign="top" align="center" width="${Math.floor(100 / milestones.length)}%" style="font-family:${FONT};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" valign="middle"><div style="height:2px;line-height:2px;font-size:0;background:${leftLine};">&nbsp;</div></td>
              <td valign="middle" width="28" style="width:28px;">${img(icon, 28, 28, "")}</td>
              <td width="50%" valign="middle"><div style="height:2px;line-height:2px;font-size:0;background:${rightLine};">&nbsp;</div></td>
            </tr>
          </table>
          <div style="font-size:14px;line-height:19px;color:#0f172a;font-weight:600;margin-top:10px;padding:0 2px;">${escapeHtml(milestone.label)}</div>
          <div style="font-size:14px;line-height:20px;color:#5b6b8c;margin-top:2px;">${escapeHtml(milestone.date || "Planned")}</div>
        </td>`;
    }).join("");

    const timelineHtml = `
<tr>
  <td style="padding:22px 32px 0 32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td valign="middle" style="padding:0 14px 0 12px;">${img("i-calendar", 26, 26, "")}</td>
        <td valign="middle" style="font-family:${FONT};font-size:19px;font-weight:700;color:#0f1b3d;">Project Timeline (Key Milestones)</td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
      <tr>${timelineCells}</tr>
    </table>
  </td>
</tr>`;

    const rows = [
        header(img, "New Store Opening Notification"),
        hero({
            img,
            icon: "hero-nso",
            title: isUpdate ? "New Store Opening Updated" : "New Store Opening Created",
            intro: isUpdate
                ? "A new store opening has been updated in the MI ARCUS Portal. Please review the latest details and timeline."
                : "A new store opening has been created in the MI ARCUS Portal and is now available for review and further processing.",
            decoration: "hero-nso-art",
            decorationSize: [200, 113]
        }),
        detailsCard(
            img,
            [
                ["b-store", "Store Name", escapeHtml(storeName || "-")],
                ["b-pin", "City", escapeHtml(city || "-")],
                ["b-building", "Status", statusPill]
            ],
            [
                ["b-calendar", dateLabel, escapeHtml(dateValue || "-")],
                ["b-doc", "Store Code", escapeHtml(storeCode || "-")],
                ["b-format", formatLabel || "Store Format", escapeHtml(formatValue || "-")]
            ]
        ),
        peopleHtml,
        timelineHtml,
        button(img, link, "Please log in to the portal to review the store opening details, timeline and take necessary actions."),
        footer(img)
    ];

    return {
        html: wrap({
            title: isUpdate ? "New Store Opening Updated" : "New Store Opening Created",
            preheader: `${storeName || "New store"} · ${city || ""} · ${status || "Planning"}`,
            rows
        }),
        attachments: attachments()
    };
};

module.exports = {
    escapeHtml,
    formatIST,
    formatStoredIST,
    formatShortDate,
    buildChecklistSubmissionEmail,
    buildNsoEmail
};
