// ==========================================================
// MI ARCUS MAILER
// Gmail API PRIMARY + optional SMTP/Resend fallback
// ==========================================================
//
// Gmail API is the recommended production transport for Render.
// It uses HTTPS, so it is not affected by Render's outbound SMTP
// restrictions that can block smtp.gmail.com:465/587.
//
// Required for Gmail API:
//   MAIL_TRANSPORT=gmail_api
//   GMAIL_CLIENT_ID=...
//   GMAIL_CLIENT_SECRET=...
//   GMAIL_REFRESH_TOKEN=...
//   GMAIL_USER=miarcus.notifications@gmail.com
//
// The authenticated Gmail account can send to normal recipient
// domains such as gmail.com, miarcus.com, jawandson.com, outlook.com,
// yahoo.com, etc.
//
// IMPORTANT:
// GMAIL_REFRESH_TOKEN is a secret. Never commit it.
//
// Optional transports:
//   smtp   -> Gmail SMTP (may be blocked by Render)
//   resend -> Resend API (production arbitrary recipients require
//             a verified sender/domain)
//   auto   -> Gmail API, then SMTP, then Resend based on configuration
// ==========================================================

const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const { Resend } = require("resend");

// ==========================================================
// ENVIRONMENT HELPERS
// ==========================================================

const env = (name, fallback = "") =>
    String(process.env[name] ?? fallback).trim();

const SMTP_HOST = env("SMTP_HOST", "smtp.gmail.com");
const SMTP_PORT = Number(env("SMTP_PORT", "587")) || 587;
const SMTP_USER = env("SMTP_USER");
const SMTP_PASS = env("SMTP_PASS");

const SMTP_SECURE_RAW = env("SMTP_SECURE").toLowerCase();
const SMTP_SECURE =
    SMTP_SECURE_RAW === "true"
        ? true
        : SMTP_SECURE_RAW === "false"
            ? false
            : SMTP_PORT === 465;

// Gmail API OAuth2.
const GMAIL_CLIENT_ID =
    env("GMAIL_CLIENT_ID") ||
    env("GOOGLE_CLIENT_ID");

const GMAIL_CLIENT_SECRET =
    env("GMAIL_CLIENT_SECRET") ||
    env("GOOGLE_CLIENT_SECRET");

const GMAIL_REFRESH_TOKEN =
    env("GMAIL_REFRESH_TOKEN") ||
    env("GOOGLE_REFRESH_TOKEN");

const GMAIL_USER =
    env("GMAIL_USER") ||
    env("SMTP_USER");

const GMAIL_CONFIGURED =
    Boolean(GMAIL_CLIENT_ID) &&
    Boolean(GMAIL_CLIENT_SECRET) &&
    Boolean(GMAIL_REFRESH_TOKEN) &&
    Boolean(GMAIL_USER);

// Resend remains available as an optional transport.
const RESEND_API_KEY = env("RESEND_API_KEY");
const RESEND_FROM = env(
    "RESEND_FROM",
    "onboarding@resend.dev"
);

const RESEND_CONFIGURED =
    Boolean(RESEND_API_KEY);

const SMTP_CONFIGURED =
    Boolean(SMTP_HOST) &&
    Boolean(SMTP_USER) &&
    Boolean(SMTP_PASS);

const MAIL_TRANSPORT =
    env("MAIL_TRANSPORT", "gmail_api").toLowerCase();

// ==========================================================
// DEFAULT FROM ADDRESS
// ==========================================================

const EMAIL_FROM =
    GMAIL_CONFIGURED
        ? GMAIL_USER
        : SMTP_CONFIGURED
            ? SMTP_USER
            : RESEND_FROM;

// ==========================================================
// GOOGLE OAUTH CLIENT
// ==========================================================

let gmailClient = null;
let gmailApi = null;

if (GMAIL_CONFIGURED) {
    const oauth2Client =
        new google.auth.OAuth2(
            GMAIL_CLIENT_ID,
            GMAIL_CLIENT_SECRET
        );

    oauth2Client.setCredentials({
        refresh_token:
            GMAIL_REFRESH_TOKEN
    });

    gmailClient = oauth2Client;
    gmailApi = google.gmail({
        version: "v1",
        auth: oauth2Client
    });
}

// ==========================================================
// RESEND CLIENT
// ==========================================================

const resend =
    RESEND_CONFIGURED
        ? new Resend(RESEND_API_KEY)
        : null;

// ==========================================================
// SMTP TRANSPORTER
// ==========================================================

let smtpTransporter = null;

if (SMTP_CONFIGURED) {
    smtpTransporter =
        nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_SECURE,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 30000,
            tls: {
                minVersion: "TLSv1.2",
                servername: SMTP_HOST
            }
        });
}

// ==========================================================
// STARTUP LOG
// ==========================================================

console.log("==========================================");
console.log("📧 MI ARCUS MAILER INITIALIZING");
console.log("==========================================");
console.log("Requested transport:", MAIL_TRANSPORT);
console.log("Gmail API configured:", GMAIL_CONFIGURED ? "YES" : "NO");
console.log("Gmail user:", GMAIL_CONFIGURED ? GMAIL_USER : "N/A");
console.log("SMTP configured:", SMTP_CONFIGURED ? "YES" : "NO");
console.log("Resend configured:", RESEND_CONFIGURED ? "YES" : "NO");
console.log("Email from:", EMAIL_FROM);
console.log("==========================================");

// ==========================================================
// EMAIL ADDRESS VALIDATION
// ==========================================================

const EMAIL_PATTERN =
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

function normalizeRecipients(to) {
    if (!to) {
        const error = new Error(
            "Email recipient is missing."
        );
        error.code = "EMAIL_RECIPIENT_MISSING";
        error.status = 400;
        throw error;
    }

    const recipients = Array.isArray(to)
        ? to
            .map((email) =>
                String(email || "")
                    .trim()
                    .toLowerCase()
            )
            .filter(Boolean)
        : [
            String(to)
                .trim()
                .toLowerCase()
        ];

    if (
        recipients.length === 0 ||
        recipients.some(
            (email) =>
                email.length > 254 ||
                !EMAIL_PATTERN.test(email)
        )
    ) {
        const error = new Error(
            "Invalid recipient email address."
        );
        error.code = "EMAIL_RECIPIENT_INVALID";
        error.status = 400;
        throw error;
    }

    return Array.isArray(to)
        ? recipients
        : recipients[0];
}

// ==========================================================
// ATTACHMENT NORMALIZATION
// ==========================================================

function normalizeSmtpAttachments(attachments) {
    if (!Array.isArray(attachments)) {
        return [];
    }

    return attachments.map((attachment) => {
        const normalized = {
            filename:
                attachment.filename ||
                "attachment",
            content:
                attachment.content
        };

        if (attachment.path) {
            normalized.path =
                attachment.path;
        }

        if (attachment.contentType) {
            normalized.contentType =
                attachment.contentType;
        }

        if (attachment.cid) {
            normalized.cid =
                String(attachment.cid)
                    .replace(/[<>\r\n]/g, "");
        }

        if (attachment.encoding) {
            normalized.encoding =
                attachment.encoding;
        }

        if (attachment.disposition) {
            normalized.contentDisposition =
                attachment.disposition;
        }

        return normalized;
    });
}

function normalizeResendAttachments(attachments) {
    if (!Array.isArray(attachments)) {
        return [];
    }

    return attachments.map((attachment) => ({
        filename:
            attachment.filename ||
            "attachment",
        content:
            attachment.content,
        ...(attachment.path
            ? { path: attachment.path }
            : {}),
        ...(attachment.cid
            ? {
                contentId:
                    String(attachment.cid)
                        .replace(/[<>\r\n]/g, "")
            }
            : {}),
        ...(attachment.contentType
            ? {
                contentType:
                    attachment.contentType
            }
            : {})
    }));
}

// ==========================================================
// TRANSPORT SELECTION
// ==========================================================

function getTransport() {
    if (MAIL_TRANSPORT === "gmail_api" ||
        MAIL_TRANSPORT === "gmail" ||
        MAIL_TRANSPORT === "google") {
        if (!GMAIL_CONFIGURED || !gmailApi) {
            const error = new Error(
                "Gmail API is selected but GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN or GMAIL_USER is missing."
            );
            error.code = "GMAIL_API_CONFIG_ERROR";
            error.status = 500;
            throw error;
        }
        return "gmail_api";
    }

    if (MAIL_TRANSPORT === "smtp") {
        if (!SMTP_CONFIGURED) {
            const error = new Error(
                "SMTP transport selected but SMTP_USER or SMTP_PASS is missing."
            );
            error.code = "SMTP_CONFIG_ERROR";
            error.status = 500;
            throw error;
        }
        return "smtp";
    }

    if (MAIL_TRANSPORT === "resend") {
        if (!RESEND_CONFIGURED || !resend) {
            const error = new Error(
                "Resend transport selected but RESEND_API_KEY is missing."
            );
            error.code = "RESEND_CONFIG_ERROR";
            error.status = 500;
            throw error;
        }
        return "resend";
    }

    // AUTO: prefer Gmail API because it works over HTTPS on Render.
    if (GMAIL_CONFIGURED) {
        return "gmail_api";
    }

    if (SMTP_CONFIGURED) {
        return "smtp";
    }

    if (RESEND_CONFIGURED) {
        return "resend";
    }

    const error = new Error(
        "No email transport is configured. Configure Gmail API OAuth2, Gmail SMTP, or Resend."
    );
    error.code = "EMAIL_TRANSPORT_NOT_CONFIGURED";
    error.status = 500;
    throw error;
}

// ==========================================================
// ERROR NORMALIZATION
// ==========================================================

function normalizeMailerError(error) {
    const normalized =
        error instanceof Error
            ? error
            : new Error(
                String(
                    error?.message ||
                    error ||
                    "Email sending failed."
                )
            );

    const originalCode =
        String(
            normalized?.code || ""
        ).toUpperCase();

    const status =
        Number(
            normalized?.statusCode ||
            normalized?.status ||
            normalized?.response?.statusCode ||
            normalized?.response?.status ||
            0
        );

    const message =
        String(
            normalized?.message || ""
        );

    // Gmail API OAuth/authentication failures.
    if (
        originalCode === "401" ||
        originalCode === "UNAUTHENTICATED" ||
        status === 401 ||
        /invalid_grant|unauthorized|invalid authentication|invalid credentials|invalid client/i.test(message)
    ) {
        normalized.code =
            "GMAIL_API_AUTH_FAILED";
        normalized.status =
            status || 401;
        normalized.message =
            "Gmail API authentication failed. Check GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN.";
        return normalized;
    }

    // Gmail API permission/scope problems.
    if (
        status === 403 ||
        /permission denied|insufficient permission|insufficient authentication scopes|forbidden/i.test(message)
    ) {
        normalized.code =
            "GMAIL_API_PERMISSION_FAILED";
        normalized.status =
            status || 403;
        normalized.message =
            "Gmail API permission failed. The OAuth token must include the Gmail send scope.";
        return normalized;
    }

    // Old SMTP errors.
    if (
        originalCode === "EAUTH" ||
        /invalid login|authentication failed|username and password not accepted|application-specific password/i.test(message)
    ) {
        normalized.code =
            "SMTP_AUTH_FAILED";
        normalized.status =
            status || 401;
        normalized.message =
            "Gmail SMTP authentication failed. Use a Gmail App Password, not the normal Gmail password.";
        return normalized;
    }

    if (
        originalCode === "ECONNECTION" ||
        originalCode === "ETIMEDOUT" ||
        originalCode === "ESOCKET" ||
        /connection timed out|connect econnrefused|could not connect|connection refused|socket hang up/i.test(message)
    ) {
        normalized.code =
            "SMTP_CONNECTION_FAILED";
        normalized.status =
            status || 503;
        normalized.message =
            `Could not connect to Gmail SMTP (${SMTP_HOST}:${SMTP_PORT}). Render may block outbound SMTP; use Gmail API instead.`;
        return normalized;
    }

    if (
        status === 401 ||
        status === 403 ||
        /api.?key|unauthoriz|forbidden/i.test(message)
    ) {
        normalized.code =
            "RESEND_AUTH_FAILED";
        normalized.status =
            status || 401;
        normalized.message =
            "Resend authentication failed. Verify RESEND_API_KEY.";
        return normalized;
    }

    normalized.status =
        normalized.status ||
        status ||
        500;

    return normalized;
}

// ==========================================================
// BUILD MIME MESSAGE
// ==========================================================
//
// Nodemailer streamTransport is used only to construct a MIME
// message. It does NOT open an SMTP connection.
// This lets Gmail API send the exact same HTML/attachments
// through HTTPS.
//
// ==========================================================

async function buildRawMimeMessage(mailOptions, normalizedTo) {
    const transport =
        nodemailer.createTransport({
            streamTransport: true,
            buffer: true,
            newline: "unix"
        });

    const message = {
        from: GMAIL_USER,
        to: normalizedTo,
        subject: mailOptions.subject
    };

    if (mailOptions.html) {
        message.html =
            mailOptions.html;
    }

    if (mailOptions.text) {
        message.text =
            mailOptions.text;
    }

    const attachments =
        normalizeSmtpAttachments(
            mailOptions.attachments
        );

    if (attachments.length) {
        message.attachments =
            attachments;
    }

    const info =
        await transport.sendMail(
            message
        );

    if (!info?.message) {
        const error = new Error(
            "Nodemailer could not build the Gmail MIME message."
        );
        error.code =
            "GMAIL_MIME_BUILD_FAILED";
        error.status = 500;
        throw error;
    }

    return Buffer.isBuffer(info.message)
        ? info.message
        : Buffer.from(
            String(info.message)
        );
}

// ==========================================================
// GMAIL API SEND
// ==========================================================

async function sendThroughGmailApi(
    mailOptions,
    normalizedTo
) {
    if (!gmailApi) {
        const error = new Error(
            "Gmail API is not configured."
        );
        error.code =
            "GMAIL_API_CONFIG_ERROR";
        error.status = 500;
        throw error;
    }

    const rawMime =
        await buildRawMimeMessage(
            mailOptions,
            normalizedTo
        );

    const raw =
        rawMime
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");

    try {
        const response =
            await gmailApi.users.messages.send({
                userId: "me",
                requestBody: {
                    raw
                }
            });

        const messageId =
            response?.data?.id ||
            null;

        return {
            id: messageId,
            messageId,
            threadId:
                response?.data?.threadId ||
                null,
            transport:
                "gmail-api",
            accepted:
                [normalizedTo],
            rejected: []
        };
    } catch (error) {
        throw normalizeMailerError(
            error
        );
    }
}

// ==========================================================
// GMAIL SMTP SEND
// ==========================================================

async function sendThroughSmtp(
    mailOptions,
    normalizedTo
) {
    if (!smtpTransporter) {
        const error = new Error(
            "Gmail SMTP transporter is not configured."
        );
        error.code =
            "SMTP_CONFIG_ERROR";
        error.status = 500;
        throw error;
    }

    const message = {
        from: SMTP_USER,
        to: normalizedTo,
        subject: mailOptions.subject
    };

    if (mailOptions.html) {
        message.html =
            mailOptions.html;
    }

    if (mailOptions.text) {
        message.text =
            mailOptions.text;
    }

    const attachments =
        normalizeSmtpAttachments(
            mailOptions.attachments
        );

    if (attachments.length) {
        message.attachments =
            attachments;
    }

    const result =
        await smtpTransporter.sendMail(
            message
        );

    return {
        id: result.messageId,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        response: result.response,
        envelope: result.envelope,
        transport: "gmail-smtp"
    };
}

// ==========================================================
// RESEND SEND
// ==========================================================

async function sendThroughResend(
    mailOptions,
    normalizedTo
) {
    if (!resend || !RESEND_API_KEY) {
        const error = new Error(
            "Resend is not configured."
        );
        error.code =
            "RESEND_CONFIG_ERROR";
        error.status = 500;
        throw error;
    }

    const payload = {
        from: RESEND_FROM,
        to: normalizedTo,
        subject: mailOptions.subject
    };

    if (mailOptions.html) {
        payload.html =
            mailOptions.html;
    }

    if (mailOptions.text) {
        payload.text =
            mailOptions.text;
    }

    const attachments =
        normalizeResendAttachments(
            mailOptions.attachments
        );

    if (attachments.length) {
        payload.attachments =
            attachments;
    }

    const { data, error } =
        await resend.emails.send(
            payload
        );

    if (error) {
        const apiError = new Error(
            error.message ||
            "Resend rejected the email."
        );
        apiError.code =
            error.name ||
            "RESEND_API_ERROR";
        apiError.status =
            error.statusCode ||
            error.status ||
            400;
        apiError.response = {
            data: error
        };
        throw apiError;
    }

    return {
        ...(data || {}),
        transport: "resend"
    };
}

// ==========================================================
// VERIFY MAILER
// ==========================================================

async function verifyMailer() {
    try {
        const transport =
            getTransport();

        console.log("==========================================");
        console.log("📧 MI ARCUS EMAIL SERVICE");
        console.log("==========================================");
        console.log(
            "Selected transport:",
            transport
        );

        if (transport === "gmail_api") {
            console.log(
                "Provider: Gmail API over HTTPS"
            );
            console.log(
                "Gmail user:",
                GMAIL_USER
            );

            // This refreshes/validates the OAuth credentials
            // without sending a real email.
            await gmailClient.getAccessToken();

            console.log(
                "✅ Gmail API authentication verified"
            );
        } else if (transport === "smtp") {
            console.log(
                "Provider: Gmail SMTP"
            );
            console.log(
                "Host:",
                SMTP_HOST
            );
            console.log(
                "Port:",
                SMTP_PORT
            );
            console.log(
                "Secure:",
                SMTP_SECURE
            );
            console.log(
                "User:",
                SMTP_USER
            );

            await smtpTransporter.verify();

            console.log(
                "✅ Gmail SMTP connection verified"
            );
        } else {
            console.log(
                "Provider: Resend API"
            );
            console.log(
                "From:",
                RESEND_FROM
            );
            console.log(
                "✅ Resend configuration loaded"
            );
        }

        console.log(
            "=========================================="
        );

        return true;
    } catch (error) {
        const normalized =
            normalizeMailerError(
                error
            );

        console.error(
            "=========================================="
        );
        console.error(
            "❌ MI ARCUS EMAIL SERVICE VERIFICATION FAILED"
        );
        console.error(
            "Code:",
            normalized.code
        );
        console.error(
            "Status:",
            normalized.status
        );
        console.error(
            "Message:",
            normalized.message
        );
        console.error(
            "=========================================="
        );

        return false;
    }
}

// ==========================================================
// SEND EMAIL
// ==========================================================

async function sendMail(
    mailOptions = {}
) {
    const normalizedTo =
        normalizeRecipients(
            mailOptions.to
        );

    if (!mailOptions.subject) {
        const error = new Error(
            "Email subject is missing."
        );
        error.code =
            "EMAIL_SUBJECT_MISSING";
        error.status = 400;
        throw error;
    }

    if (
        !mailOptions.html &&
        !mailOptions.text
    ) {
        const error = new Error(
            "Email content is missing."
        );
        error.code =
            "EMAIL_CONTENT_MISSING";
        error.status = 400;
        throw error;
    }

    const transport =
        getTransport();

    console.log("==========================================");
    console.log(
        "📧 MI ARCUS EMAIL SEND"
    );
    console.log(
        "Transport:",
        transport === "gmail_api"
            ? "Gmail API"
            : transport === "smtp"
                ? "Gmail SMTP"
                : "Resend API"
    );
    console.log(
        "From:",
        transport === "gmail_api"
            ? GMAIL_USER
            : transport === "smtp"
                ? SMTP_USER
                : RESEND_FROM
    );
    console.log(
        "To:",
        normalizedTo
    );
    console.log(
        "Subject:",
        mailOptions.subject
    );
    console.log("==========================================");

    try {
        let result;

        if (transport === "gmail_api") {
            result =
                await sendThroughGmailApi(
                    mailOptions,
                    normalizedTo
                );
        } else if (transport === "smtp") {
            result =
                await sendThroughSmtp(
                    mailOptions,
                    normalizedTo
                );
        } else {
            result =
                await sendThroughResend(
                    mailOptions,
                    normalizedTo
                );
        }

        console.log("==========================================");
        console.log(
            "✅ MI ARCUS EMAIL SENT SUCCESSFULLY"
        );
        console.log(
            "Transport:",
            result?.transport ||
            transport
        );
        console.log(
            "From:",
            transport === "gmail_api"
                ? GMAIL_USER
                : transport === "smtp"
                    ? SMTP_USER
                    : RESEND_FROM
        );
        console.log(
            "To:",
            normalizedTo
        );
        console.log(
            "Subject:",
            mailOptions.subject
        );
        console.log(
            "Message ID:",
            result?.id ||
            result?.messageId ||
            "N/A"
        );
        console.log("==========================================");

        return result;
    } catch (error) {
        const normalizedError =
            normalizeMailerError(
                error
            );

        console.error("==========================================");
        console.error(
            "❌ MI ARCUS EMAIL SEND FAILED"
        );
        console.error(
            "Transport:",
            transport
        );
        console.error(
            "From:",
            transport === "gmail_api"
                ? GMAIL_USER
                : transport === "smtp"
                    ? SMTP_USER
                    : RESEND_FROM
        );
        console.error(
            "To:",
            normalizedTo
        );
        console.error(
            "Subject:",
            mailOptions.subject
        );
        console.error(
            "Code:",
            normalizedError.code ||
            "N/A"
        );
        console.error(
            "Status:",
            normalizedError.status ||
            normalizedError.statusCode ||
            "N/A"
        );
        console.error(
            "Message:",
            normalizedError.message ||
            "Unknown email error"
        );

        if (
            normalizedError?.response?.data
        ) {
            console.error(
                "Provider Response:",
                JSON.stringify(
                    normalizedError.response.data,
                    null,
                    2
                )
            );
        }

        console.error("==========================================");
        throw normalizedError;
    }
}

// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {
    sendMail,
    verifyMailer,
    normalizeMailerError,
    resend,
    EMAIL_FROM,
    GMAIL_USER,
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    SMTP_USER,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    RESEND_FROM
};
