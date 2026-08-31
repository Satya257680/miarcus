// ==========================================================
// MI ARCUS MAILER
// Gmail SMTP / Nodemailer
// ==========================================================
//
// Sends Mi Arcus emails through the Gmail account configured
// in Render. Recipient domains are NOT restricted.
//
// Required Render Environment Variables:
// SMTP_HOST=smtp.gmail.com
// SMTP_PORT=465
// SMTP_SECURE=true
// SMTP_USER=miarcus.notification@gmail.com
// SMTP_PASS=<Google 16-character App Password>
//
// Optional:
// SMTP_FROM=miarcus.notification@gmail.com
//
// IMPORTANT:
// - SMTP_PASS must be a Google App Password, NOT the normal
//   Gmail account password.
// - Enable 2-Step Verification on the Gmail account first.
// - SMTP_FROM should normally match SMTP_USER.
// ==========================================================

const nodemailer = require("nodemailer");

// ==========================================================
// ENVIRONMENT
// ==========================================================

const SMTP_HOST =
    String(process.env.SMTP_HOST || "smtp.gmail.com").trim();

const SMTP_PORT =
    Number(process.env.SMTP_PORT || 465);

const SMTP_SECURE =
    String(
        process.env.SMTP_SECURE ??
        (SMTP_PORT === 465 ? "true" : "false")
    ).trim().toLowerCase() === "true";

const SMTP_USER =
    String(process.env.SMTP_USER || "").trim();

const SMTP_PASS =
    // Google may display an App Password with spaces for readability.
    // Remove whitespace so both formats work when pasted into Render.
    String(process.env.SMTP_PASS || "").replace(/\s+/g, "");

const EMAIL_FROM =
    String(
        process.env.SMTP_FROM ||
        process.env.EMAIL_FROM ||
        SMTP_USER
    ).trim();

// ==========================================================
// CONFIGURATION VALIDATION
// ==========================================================

const mailerConfigErrors = [];

if (!SMTP_HOST) {
    mailerConfigErrors.push("SMTP_HOST");
}

if (!Number.isInteger(SMTP_PORT) || SMTP_PORT < 1 || SMTP_PORT > 65535) {
    mailerConfigErrors.push("SMTP_PORT");
}

if (!SMTP_USER) {
    mailerConfigErrors.push("SMTP_USER");
}

if (!SMTP_PASS) {
    mailerConfigErrors.push("SMTP_PASS");
}

if (!EMAIL_FROM) {
    mailerConfigErrors.push("SMTP_FROM");
}

// ==========================================================
// CLIENT
// ==========================================================

const transporter =
    mailerConfigErrors.length
        ? null
        : nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_SECURE,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            },
            connectionTimeout: 20000,
            greetingTimeout: 20000,
            socketTimeout: 30000
        });

// ==========================================================
// STARTUP LOG
// ==========================================================

console.log("==========================================");
console.log("📧 MI ARCUS MAILER INITIALIZING");
console.log("Transport: Gmail SMTP");
console.log("Host:", SMTP_HOST);
console.log("Port:", SMTP_PORT);
console.log("Secure:", SMTP_SECURE);
console.log("From:", EMAIL_FROM);

if (mailerConfigErrors.length) {
    console.error(
        "❌ SMTP CONFIGURATION ERROR:",
        mailerConfigErrors.join(", ")
    );
} else {
    console.log("✅ Gmail SMTP configuration loaded");
}

console.log("==========================================");

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
        String(normalized?.code || "").toUpperCase();

    const originalMessage =
        String(normalized?.message || "");

    if (
        originalCode === "EAUTH" ||
        /authentication|invalid login|username.*password|535/i.test(
            originalMessage
        )
    ) {
        normalized.code = "SMTP_AUTH_FAILED";
        normalized.status = 401;
        normalized.message =
            "Gmail SMTP authentication failed. Verify SMTP_USER and use a valid Google App Password in Render.";
    }
    else if (
        originalCode === "ECONNECTION" ||
        originalCode === "ETIMEDOUT" ||
        originalCode === "ESOCKET" ||
        /connection|timeout|socket/i.test(originalMessage)
    ) {
        normalized.code = "SMTP_CONNECTION_FAILED";
        normalized.status = 503;
        normalized.message =
            "Could not connect to Gmail SMTP. Verify SMTP_HOST, SMTP_PORT and SMTP_SECURE in Render.";
    }
    else if (
        originalCode === "EENVELOPE" ||
        /recipient|mailbox|address/i.test(originalMessage)
    ) {
        normalized.code = "SMTP_RECIPIENT_FAILED";
        normalized.status = 400;
    }

    return normalized;
}

// ==========================================================
// VERIFY SMTP CONFIGURATION / CONNECTION
// ==========================================================

async function verifyMailer() {

    if (mailerConfigErrors.length || !transporter) {

        console.error(
            "❌ MI ARCUS EMAIL SERVICE IS NOT READY."
        );

        console.error(
            "Missing/invalid:",
            mailerConfigErrors.join(", ")
        );

        return false;
    }

    console.log("==========================================");
    console.log("📧 VERIFYING MI ARCUS GMAIL SMTP");
    console.log("Transport: Gmail SMTP");
    console.log("Host:", SMTP_HOST);
    console.log("Port:", SMTP_PORT);
    console.log("Secure:", SMTP_SECURE);
    console.log("From:", EMAIL_FROM);

    try {

        await transporter.verify();

        console.log("Status: SMTP connection/authentication OK");
        console.log("==========================================");

        return true;

    } catch (error) {

        const normalizedError =
            normalizeMailerError(error);

        console.error(
            "❌ Gmail SMTP verification failed:",
            normalizedError.message
        );

        console.error("Code:", normalizedError.code || "N/A");
        console.error("==========================================");

        // Do not stop the server. Email sending will report the same
        // normalized error when the application attempts to send.
        return false;
    }
}

// ==========================================================
// SEND EMAIL
// ==========================================================

async function sendMail(mailOptions = {}) {

    if (mailerConfigErrors.length || !transporter) {

        const error = new Error(
            `MI ARCUS SMTP configuration is incomplete: ${mailerConfigErrors.join(", ")}.`
        );

        error.code = "SMTP_CONFIG_ERROR";
        error.status = 500;

        throw error;
    }

    if (!mailOptions.to) {

        const error = new Error(
            "Email recipient is missing."
        );

        error.code = "EMAIL_RECIPIENT_MISSING";
        error.status = 400;

        throw error;
    }

    // Accept any syntactically valid public email domain.
    // No Gmail / Miarcus / Jawandson-only whitelist is used.
    const recipients = Array.isArray(mailOptions.to)
        ? mailOptions.to
            .map((email) => String(email || "").trim().toLowerCase())
            .filter(Boolean)
        : [String(mailOptions.to).trim().toLowerCase()];

    const emailPattern =
        /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

    if (
        recipients.length === 0 ||
        recipients.some(
            (email) =>
                email.length > 254 ||
                !emailPattern.test(email)
        )
    ) {
        const error = new Error(
            "Invalid recipient email address."
        );

        error.code = "EMAIL_RECIPIENT_INVALID";
        error.status = 400;

        throw error;
    }

    const normalizedTo =
        Array.isArray(mailOptions.to)
            ? recipients
            : recipients[0];

    if (!mailOptions.subject) {

        const error = new Error(
            "Email subject is missing."
        );

        error.code = "EMAIL_SUBJECT_MISSING";
        error.status = 400;

        throw error;
    }

    if (!mailOptions.html && !mailOptions.text) {

        const error = new Error(
            "Email content is missing."
        );

        error.code = "EMAIL_CONTENT_MISSING";
        error.status = 400;

        throw error;
    }

    try {

        console.log("==========================================");
        console.log("📧 MI ARCUS EMAIL SEND");
        console.log("Transport: Gmail SMTP");
        console.log("From:", EMAIL_FROM);
        console.log("To:", normalizedTo);
        console.log("Subject:", mailOptions.subject);
        console.log("==========================================");

        const suppliedAttachments =
            Array.isArray(mailOptions.attachments)
                ? mailOptions.attachments
                : [];

        const message = {
            from: EMAIL_FROM,
            to: normalizedTo,
            subject: mailOptions.subject
        };

        if (mailOptions.html) {
            message.html = mailOptions.html;
        }

        if (mailOptions.text) {
            message.text = mailOptions.text;
        }

        if (suppliedAttachments.length) {
            message.attachments = suppliedAttachments.map(
                (attachment) => ({
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
                            cid: String(attachment.cid)
                                .replace(/[<>\r\n]/g, "")
                        }
                        : {}),
                    ...(attachment.contentType
                        ? { contentType: attachment.contentType }
                        : {}),
                    ...(attachment.disposition
                        ? { disposition: attachment.disposition }
                        : {})
                })
            );
        }

        const result =
            await transporter.sendMail(message);

        console.log("==========================================");
        console.log("✅ MI ARCUS EMAIL SENT SUCCESSFULLY");
        console.log("Transport: Gmail SMTP");
        console.log("Message ID:", result?.messageId || "N/A");
        console.log("Accepted:", result?.accepted || []);
        console.log("Rejected:", result?.rejected || []);
        console.log("From:", EMAIL_FROM);
        console.log("To:", normalizedTo);
        console.log("Subject:", mailOptions.subject);
        console.log("==========================================");

        return result;

    } catch (error) {

        const normalizedError =
            normalizeMailerError(error);

        console.error("==========================================");
        console.error("❌ MI ARCUS EMAIL SEND FAILED");
        console.error("Transport: Gmail SMTP");
        console.error("From:", EMAIL_FROM);
        console.error("To:", mailOptions.to);
        console.error("Subject:", mailOptions.subject);
        console.error(
            "Code:",
            normalizedError?.code || "N/A"
        );
        console.error(
            "Status:",
            normalizedError?.status || "N/A"
        );
        console.error(
            "Message:",
            normalizedError?.message || "Unknown error"
        );
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
    transporter,
    EMAIL_FROM
};
