const { getAppUrl } = require("../../config/appUrl");

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

const announcementEmail = ({
    recipientName = "there",
    title,
    content,
    announcementUrl,
    attachmentUrl,
    attachmentName
}) => {
    const website = getAppUrl();

    const safeTitle = escapeHtml(title || "New Announcement");
    const safeName = escapeHtml(recipientName || "there");
    const safeContent = escapeHtml(content || "").replace(/\r?\n/g, "<br>");
    const safeAttachmentName = escapeHtml(attachmentName || "Announcement attachment");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f9;font-family:Arial,Helvetica,sans-serif;color:#263238;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f7f9;padding:32px 12px;">
<tr>
<td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,.08);">

<tr>
<td align="center" style="background:#b8dce4;padding:24px 24px;">
<a href="${website}" target="_blank" style="text-decoration:none;">
<img src="${String(process.env.BACKEND_URL || "https://miarcus-backend.onrender.com").replace(/\/+$/,"")}/images/MiArcus-brand-theme.png"
     alt="Mi Arcus" width="110"
     style="display:block;border:0;max-width:150px;height:auto;">
</a>
</td>
</tr>

<tr>
<td style="padding:38px 42px 18px;">
<p style="margin:0 0 18px;font-size:17px;line-height:28px;color:#4d5b60;">
Hello <strong style="color:#1c6674;">${safeName}</strong>,
</p>

<h1 style="margin:0 0 18px;font-size:28px;line-height:36px;color:#17333a;">
${safeTitle}
</h1>

<p style="margin:0;font-size:16px;line-height:28px;color:#59686d;">
A new announcement has been published for you on Mi Arcus. Please review the details below.
</p>
</td>
</tr>

<tr>
<td style="padding:0 42px 24px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7fbfc;border:1px solid #dbecef;border-radius:12px;">
<tr>
<td style="padding:22px 24px;">
<div style="font-size:15px;line-height:27px;color:#46575c;">
${safeContent || "Please open the announcement to view the full details."}
</div>
</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="padding:4px 42px 10px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center" style="padding:8px;">
<a href="${announcementUrl}" target="_blank"
style="display:inline-block;background:#16879a;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:9px;font-size:15px;font-weight:bold;">
Open Announcement
</a>
</td>
${attachmentUrl ? `
<td align="center" style="padding:8px;">
<a href="${attachmentUrl}" target="_blank"
style="display:inline-block;background:#ffffff;color:#16879a;text-decoration:none;padding:13px 22px;border-radius:9px;font-size:15px;font-weight:bold;border:1px solid #16879a;">
Open Attachment
</a>
</td>
` : ""}
</tr>
</table>
</td>
</tr>

${attachmentName ? `
<tr>
<td style="padding:14px 42px 28px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafb;border:1px solid #e2e8ea;border-radius:10px;">
<tr>
<td style="padding:15px 18px;">
<div style="font-size:13px;color:#728086;margin-bottom:5px;">ATTACHMENT</div>
<div style="font-size:15px;font-weight:bold;color:#24383e;word-break:break-word;">
${safeAttachmentName}
</div>
<div style="font-size:12px;color:#7a878b;margin-top:6px;">
The same file is included as a direct email attachment for easy opening or download.
</div>
</td>
</tr>
</table>
</td>
</tr>
` : ""}

<tr>
<td style="padding:4px 42px 36px;">
<p style="margin:0;font-size:14px;line-height:24px;color:#718086;">
You can also sign in to Mi Arcus at any time to review your announcements and other assigned updates.
</p>
<p style="margin:18px 0 0;font-size:14px;line-height:24px;color:#718086;">
If you were not expecting this message, please contact your administrator.
</p>
</td>
</tr>

<tr>
<td align="center" style="background:#f5f9fa;padding:22px 24px;border-top:1px solid #e5edef;">
<p style="margin:0;font-size:13px;color:#7a888d;">
Sent from <strong style="color:#16879a;">Mi Arcus</strong>
</p>
<p style="margin:7px 0 0;font-size:12px;color:#9aa5a9;">
Internal Management Portal
</p>
</td>
</tr>

</table>
</td>
</tr>
</table>
</body>
</html>
`;
};

module.exports = announcementEmail;
