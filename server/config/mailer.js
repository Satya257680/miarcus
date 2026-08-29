// ==========================================================
// MI ARCUS MAILER
// Gmail SMTP + Google App Password
// ==========================================================
//
// This mailer intentionally uses Gmail SMTP.
//
// IMPORTANT:
// - Do NOT use Gmail OAuth2 here.
// - Do NOT use GMAIL_CLIENT_ID.
// - Do NOT use GMAIL_CLIENT_SECRET.
// - Do NOT use GMAIL_REFRESH_TOKEN.
// - Use a Google App Password in SMTP_PASS.
//
// Required Render Environment Variables:
//
// SMTP_HOST=smtp.gmail.com
// SMTP_PORT=465
// SMTP_SECURE=true
// SMTP_USER=miarcus.notifications@gmail.com
// SMTP_PASS=YOUR_16_CHARACTER_GOOGLE_APP_PASSWORD
// EMAIL_FROM=miarcus.notifications@gmail.com
//
// SMTP_PASS must NEVER be logged.
//
// ==========================================================

const nodemailer = require("nodemailer");

// ==========================================================
// ENVIRONMENT
// ==========================================================

const SMTP_HOST = String(
    process.env.SMTP_HOST || "smtp.gmail.com"
).trim();

const SMTP_PORT = Number(
    process.env.SMTP_PORT || 465
);

const SMTP_SECURE = String(
    process.env.SMTP_SECURE ?? "true"
).trim().toLowerCase() === "true";

const SMTP_USER = String(
    process.env.SMTP_USER || ""
).trim();

const SMTP_PASS = String(
    process.env.SMTP_PASS || ""
).replace(/\s+/g, "");

const EMAIL_FROM = String(
    process.env.EMAIL_FROM || SMTP_USER
).trim();

// ==========================================================
// CONFIGURATION VALIDATION
// ==========================================================

const mailerConfigErrors = [];

if (!SMTP_HOST) {
    mailerConfigErrors.push("SMTP_HOST");
}

if (
    !Number.isInteger(SMTP_PORT) ||
    SMTP_PORT < 1 ||
    SMTP_PORT > 65535
) {
    mailerConfigErrors.push("SMTP_PORT");
}

if (!SMTP_USER) {
    mailerConfigErrors.push("SMTP_USER");
}

if (!SMTP_PASS) {
    mailerConfigErrors.push("SMTP_PASS");
}

if (!EMAIL_FROM) {
    mailerConfigErrors.push("EMAIL_FROM");
}

// Gmail SMTP configuration sanity check.
if (SMTP_HOST === "smtp.gmail.com") {
    if (SMTP_SECURE && SMTP_PORT !== 465) {
        console.warn(
            "⚠️ Gmail SMTP: secure=true normally requires port 465."
        );
    }

    if (!SMTP_SECURE && SMTP_PORT !== 587) {
        console.warn(
            "⚠️ Gmail SMTP: secure=false normally requires port 587."
        );
    }
}

// ==========================================================
// STARTUP CONFIGURATION LOG
// ==========================================================

console.log("==========================================");
console.log("📧 MI ARCUS MAILER INITIALIZING");
console.log("Transport: Gmail SMTP");
console.log("SMTP Host:", SMTP_HOST);
console.log("SMTP Port:", SMTP_PORT);
console.log("SMTP Secure:", SMTP_SECURE);
console.log("SMTP User:", SMTP_USER);
console.log("From:", EMAIL_FROM);
console.log("Authentication: Google App Password");

if (mailerConfigErrors.length) {
    console.error(
        "❌ SMTP CONFIGURATION ERROR:",
        mailerConfigErrors.join(", ")
    );
} else {
    console.log("✅ SMTP configuration loaded");
}

console.log("==========================================");

// ==========================================================
// SMTP TRANSPORT
// ==========================================================

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,

    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    },

    // Prevent requests from hanging forever.
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,

    // Gmail TLS security.
    tls: {
        minVersion: "TLSv1.2",
        servername: SMTP_HOST
    }
});

// ==========================================================
// ERROR NORMALIZATION
// ==========================================================

function normalizeMailerError(error) {
    const normalized =
        error instanceof Error
            ? error
            : new Error(
                String(
                    error || "Email sending failed."
                )
            );

    const originalCode = String(
        normalized?.code || ""
    ).toUpperCase();

    const responseCode = Number(
        normalized?.responseCode || 0
    );

    // ------------------------------------------------------
    // Authentication errors
    // ------------------------------------------------------

    if (
        originalCode === "EAUTH" ||
        responseCode === 535 ||
        responseCode === 534
    ) {
        normalized.code = "SMTP_AUTH_FAILED";
        normalized.status = 401;

        normalized.message =
            "Gmail SMTP authentication failed. Verify SMTP_USER and SMTP_PASS in Render. SMTP_PASS must be a valid Google App Password.";
    }

    // ------------------------------------------------------
    // Connection errors
    // ------------------------------------------------------

    else if (
        originalCode === "ECONNECTION" ||
        originalCode === "ETIMEDOUT" ||
        originalCode === "ESOCKET"
    ) {
        normalized.code = "SMTP_CONNECTION_FAILED";
        normalized.status = 503;

        normalized.message =
            "Unable to connect to Gmail SMTP. Please verify SMTP_HOST, SMTP_PORT and SMTP_SECURE.";
    }

    // ------------------------------------------------------
    // DNS error
    // ------------------------------------------------------

    else if (
        originalCode === "ENOTFOUND"
    ) {
        normalized.code = "SMTP_HOST_NOT_FOUND";
        normalized.status = 503;

        normalized.message =
            "Gmail SMTP host could not be resolved.";
    }

    return normalized;
}

// ==========================================================
// VERIFY SMTP CONNECTION
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

    try {

        console.log("==========================================");
        console.log("📧 VERIFYING MI ARCUS SMTP");
        console.log("SMTP:", `${SMTP_HOST}:${SMTP_PORT}`);
        console.log("User:", SMTP_USER);
        console.log("==========================================");

        await transporter.verify();

        console.log("==========================================");
        console.log("✅ MI ARCUS SMTP CONNECTION SUCCESSFUL");
        console.log("==========================================");

        return true;

    } catch (error) {

        const normalizedError =
            normalizeMailerError(error);

        console.error("==========================================");
        console.error("❌ MI ARCUS SMTP CONNECTION FAILED");
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

        return false;
    }
}

// ==========================================================
// SEND EMAIL
// ==========================================================

async function sendMail(mailOptions = {}) {

    // ------------------------------------------------------
    // Configuration check
    // ------------------------------------------------------

    if (mailerConfigErrors.length) {

        const error = new Error(
            `MI ARCUS SMTP configuration is incomplete: ${mailerConfigErrors.join(", ")}.`
        );

        error.code = "SMTP_CONFIG_ERROR";
        error.status = 500;

        throw error;
    }

    // ------------------------------------------------------
    // Validate recipient
    // ------------------------------------------------------

    if (!mailOptions.to) {
        const error = new Error(
            "Email recipient is missing."
        );

        error.code = "EMAIL_RECIPIENT_MISSING";
        error.status = 400;

        throw error;
    }

    // ------------------------------------------------------
    // Validate subject
    // ------------------------------------------------------

    if (!mailOptions.subject) {
        const error = new Error(
            "Email subject is missing."
        );

        error.code = "EMAIL_SUBJECT_MISSING";
        error.status = 400;

        throw error;
    }

    // ------------------------------------------------------
    // Validate content
    // ------------------------------------------------------

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

    // ------------------------------------------------------
    // IMPORTANT:
    // Always send through the configured Mi Arcus account.
    //
    // This prevents another caller from accidentally using
    // a different "from" address that Gmail may reject.
    // ------------------------------------------------------

    const from = EMAIL_FROM;

    try {

        console.log("==========================================");
        console.log("📧 MI ARCUS EMAIL SEND");
        console.log("Transport: Gmail SMTP");
        console.log("From:", from);
        console.log("To:", mailOptions.to);
        console.log("Subject:", mailOptions.subject);
        console.log("==========================================");

        const result =
            await transporter.sendMail({

                from,

                to: mailOptions.to,

                subject:
                    mailOptions.subject,

                html:
                    mailOptions.html,

                text:
                    mailOptions.text,

                attachments:
                    Array.isArray(
                        mailOptions.attachments
                    )
                        ? mailOptions.attachments
                        : []
            });

        // --------------------------------------------------
        // Verify Gmail accepted the message
        // --------------------------------------------------

        const accepted =
            Array.isArray(result?.accepted)
                ? result.accepted
                : [];

        const rejected =
            Array.isArray(result?.rejected)
                ? result.rejected
                : [];

        if (
            rejected.length > 0 &&
            accepted.length === 0
        ) {
            const error = new Error(
                "Gmail rejected the email recipient."
            );

            error.code =
                "SMTP_RECIPIENT_REJECTED";

            error.status = 502;

            error.rejected = rejected;

            throw error;
        }

        console.log("==========================================");
        console.log("✅ MI ARCUS EMAIL SENT");
        console.log(
            "Message ID:",
            result?.messageId || "N/A"
        );
        console.log(
            "Accepted:",
            accepted
        );
        console.log(
            "Rejected:",
            rejected
        );
        console.log("==========================================");

        return result;

    } catch (error) {

        const normalizedError =
            normalizeMailerError(error);

        console.error("==========================================");
        console.error("❌ MI ARCUS EMAIL SEND FAILED");
        console.error("Transport: Gmail SMTP");
        console.error("From:", from);
        console.error("To:", mailOptions.to);
        console.error(
            "Subject:",
            mailOptions.subject
        );
        console.error(
            "Code:",
            normalizedError?.code || "N/A"
        );
        console.error(
            "Status:",
            normalizedError?.status || "N/A"
        );
        console.error(
            "Command:",
            normalizedError?.command || "N/A"
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
    transporter
};