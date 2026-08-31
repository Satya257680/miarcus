// ==========================================================
// MI ARCUS MAILER
// Resend API - Free plan compatible
// ==========================================================
//
// This mailer uses Resend's HTTP API instead of SMTP.
// It does NOT require Gmail SMTP, an App Password, or
// SMTP ports that may be blocked by the hosting provider.
//
// Required Render Environment Variable:
// RESEND_API_KEY=re_...
//
// Optional:
// RESEND_FROM=onboarding@resend.dev
//
// IMPORTANT:
// - Keep RESEND_API_KEY secret.
// - The default test sender is onboarding@resend.dev.
// - The application does not restrict recipient domains.
// - For production delivery to arbitrary recipients, Resend requires
//   a sender address on a verified domain.
// ==========================================================

const { Resend } = require("resend");

// ==========================================================
// ENVIRONMENT
// ==========================================================

const RESEND_API_KEY = String(
    process.env.RESEND_API_KEY || ""
).trim();

const EMAIL_FROM = String(
    process.env.RESEND_FROM ||
    process.env.EMAIL_FROM ||
    "onboarding@resend.dev"
).trim();

// ==========================================================
// CONFIGURATION VALIDATION
// ==========================================================

const mailerConfigErrors = [];

if (!RESEND_API_KEY) {
    mailerConfigErrors.push("RESEND_API_KEY");
}

if (!EMAIL_FROM) {
    mailerConfigErrors.push("RESEND_FROM");
}

// ==========================================================
// CLIENT
// ==========================================================

const resend = RESEND_API_KEY
    ? new Resend(RESEND_API_KEY)
    : null;

// ==========================================================
// STARTUP LOG
// ==========================================================

console.log("==========================================");
console.log("📧 MI ARCUS MAILER INITIALIZING");
console.log("Transport: Resend API");
console.log("From:", EMAIL_FROM);

if (mailerConfigErrors.length) {
    console.error(
        "❌ RESEND CONFIGURATION ERROR:",
        mailerConfigErrors.join(", ")
    );
} else {
    console.log("✅ Resend configuration loaded");
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

    const originalCode = String(
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

    if (
        originalCode === "RESEND_API_KEY_MISSING" ||
        originalCode === "API_KEY_MISSING"
    ) {
        normalized.code = "RESEND_API_KEY_MISSING";
        normalized.status = 500;
        normalized.message =
            "RESEND_API_KEY is not configured in Render.";
    }

    else if (
        status === 401 ||
        status === 403 ||
        /api.?key|unauthoriz|forbidden/i.test(
            normalized?.message || ""
        )
    ) {
        normalized.code = "RESEND_AUTH_FAILED";
        normalized.status = status || 401;
        normalized.message =
            "Resend authentication failed. Verify RESEND_API_KEY in Render.";
    }

    else if (
        /from|sender|domain/i.test(
            normalized?.message || ""
        ) &&
        /verify|invalid|not allowed|not authorized/i.test(
            normalized?.message || ""
        )
    ) {
        normalized.code = "RESEND_SENDER_ERROR";
        normalized.status = status || 400;
        normalized.message =
            `Resend rejected the sender address "${EMAIL_FROM}". Use onboarding@resend.dev for testing, or a sender address on a verified Resend domain.`;
    }

    return normalized;
}

// ==========================================================
// VERIFY RESEND CONFIGURATION
// ==========================================================
//
// Resend does not require an SMTP-style connection test.
// The API key is validated when the first email is sent.
// This startup check only verifies that the required
// configuration exists.
// ==========================================================

async function verifyMailer() {

    if (mailerConfigErrors.length) {

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
    console.log("📧 VERIFYING MI ARCUS RESEND CONFIG");
    console.log("Transport: Resend API");
    console.log("From:", EMAIL_FROM);
    console.log("Status: Configuration ready");
    console.log("==========================================");

    return true;
}

// ==========================================================
// SEND EMAIL
// ==========================================================

async function sendMail(mailOptions = {}) {

    if (mailerConfigErrors.length || !resend) {

        const error = new Error(
            `MI ARCUS Resend configuration is incomplete: ${mailerConfigErrors.join(", ")}.`
        );

        error.code = "RESEND_CONFIG_ERROR";
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

    // Accept any normal public email domain.
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

    const normalizedTo = Array.isArray(mailOptions.to)
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

    if (
        !mailOptions.html &&
        !mailOptions.text
    ) {

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
        console.log("Transport: Resend API");
        console.log("From:", EMAIL_FROM);
        console.log("To:", normalizedTo);
        console.log("Subject:", mailOptions.subject);
        console.log("==========================================");

        const payload = {
            from: EMAIL_FROM,
            to: normalizedTo,
            subject: mailOptions.subject
        };

        if (mailOptions.html) {
            payload.html = mailOptions.html;
        }

        if (mailOptions.text) {
            payload.text = mailOptions.text;
        }

        const suppliedAttachments =
            Array.isArray(mailOptions.attachments)
                ? mailOptions.attachments
                : [];

        if (suppliedAttachments.length) {
            payload.attachments = suppliedAttachments.map(
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
                        ? { contentId: String(attachment.cid).replace(/[<>\r\n]/g, "") }
                        : {}),
                    ...(attachment.contentType
                        ? { contentType: attachment.contentType }
                        : {})
                })
            );
        }

        const { data, error } =
            await resend.emails.send(payload);

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

        console.log("==========================================");
        console.log("✅ MI ARCUS EMAIL SENT SUCCESSFULLY");
        console.log("Transport: Resend API");
        console.log("Message ID:", data?.id || "N/A");
        console.log("From:", EMAIL_FROM);
        console.log("To:", normalizedTo);
        console.log("Subject:", mailOptions.subject);
        console.log("==========================================");

        return data;

    } catch (error) {

        const normalizedError =
            normalizeMailerError(error);

        console.error("==========================================");
        console.error("❌ MI ARCUS EMAIL SEND FAILED");
        console.error("Transport: Resend API");
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

        if (normalizedError?.response?.data) {
            console.error(
                "Provider Response:",
                JSON.stringify(normalizedError.response.data)
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
    EMAIL_FROM
};
