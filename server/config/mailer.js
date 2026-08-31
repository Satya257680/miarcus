// ==========================================================
// MI ARCUS MAILER
// Gmail SMTP PRIMARY + Resend FALLBACK
// ==========================================================
//
// PRIMARY:
//   Gmail SMTP
//
// FALLBACK:
//   Resend API
//
// Gmail SMTP can send to normal recipient domains such as:
//   gmail.com
//   miarcus.com
//   jawandson.com
//   outlook.com
//   yahoo.com
//   company domains
//   etc.
//
// IMPORTANT:
// Gmail SMTP requires a Gmail App Password.
// Do NOT use the normal Gmail account password.
//
// Recommended Gmail SMTP settings:
//
// SMTP_HOST=smtp.gmail.com
// SMTP_PORT=587
// SMTP_SECURE=false
// SMTP_USER=miarcus.notifications@gmail.com
// SMTP_PASS=YOUR_16_CHARACTER_GMAIL_APP_PASSWORD
//
// Resend fallback:
//
// RESEND_API_KEY=re_...
// RESEND_FROM=onboarding@resend.dev
//
// ==========================================================

const nodemailer = require("nodemailer");
const { Resend } = require("resend");

// ==========================================================
// ENVIRONMENT
// ==========================================================

const SMTP_HOST = String(
    process.env.SMTP_HOST || "smtp.gmail.com"
).trim();

const SMTP_PORT = Number(
    process.env.SMTP_PORT || 587
);

const SMTP_USER = String(
    process.env.SMTP_USER || ""
).trim();

const SMTP_PASS = String(
    process.env.SMTP_PASS || ""
).trim();

const SMTP_SECURE_RAW = String(
    process.env.SMTP_SECURE || ""
).trim().toLowerCase();

const SMTP_SECURE =
    SMTP_SECURE_RAW === "true"
        ? true
        : SMTP_SECURE_RAW === "false"
            ? false
            : SMTP_PORT === 465;

// ----------------------------------------------------------
// Resend
// ----------------------------------------------------------

const RESEND_API_KEY = String(
    process.env.RESEND_API_KEY || ""
).trim();

const RESEND_FROM = String(
    process.env.RESEND_FROM ||
    "onboarding@resend.dev"
).trim();

// ----------------------------------------------------------
// Transport selection
// ----------------------------------------------------------
//
// auto:
//   Gmail SMTP when SMTP credentials exist.
//   Otherwise Resend.
//
// smtp:
//   Force Gmail SMTP.
//
// resend:
//   Force Resend.
//
// ==========================================================

const MAIL_TRANSPORT = String(
    process.env.MAIL_TRANSPORT || "auto"
).trim().toLowerCase();

const SMTP_CONFIGURED =
    Boolean(SMTP_HOST) &&
    Boolean(SMTP_USER) &&
    Boolean(SMTP_PASS);

const RESEND_CONFIGURED =
    Boolean(RESEND_API_KEY);

// ==========================================================
// DEFAULT FROM ADDRESS
// ==========================================================
//
// When Gmail SMTP is used, the From address MUST normally
// match the authenticated Gmail account.
//
// Therefore:
//
// SMTP:
//   miarcus.notifications@gmail.com
//
// Resend:
//   onboarding@resend.dev
//
// ==========================================================

const EMAIL_FROM = SMTP_CONFIGURED
    ? SMTP_USER
    : RESEND_FROM;

// ==========================================================
// RESEND CLIENT
// ==========================================================

const resend =
    RESEND_API_KEY
        ? new Resend(RESEND_API_KEY)
        : null;

// ==========================================================
// SMTP TRANSPORTER
// ==========================================================

let smtpTransporter = null;

if (SMTP_CONFIGURED) {

    smtpTransporter = nodemailer.createTransport({

        host:
            SMTP_HOST,

        port:
            SMTP_PORT,

        secure:
            SMTP_SECURE,

        auth: {

            user:
                SMTP_USER,

            pass:
                SMTP_PASS

        },

        connectionTimeout:
            15000,

        greetingTimeout:
            15000,

        socketTimeout:
            30000,

        tls: {

            minVersion:
                "TLSv1.2",

            servername:
                SMTP_HOST

        }

    });

}

// ==========================================================
// STARTUP CONFIGURATION
// ==========================================================

console.log("==========================================");
console.log("📧 MI ARCUS MAILER INITIALIZING");
console.log("==========================================");

console.log(
    "Requested transport:",
    MAIL_TRANSPORT
);

console.log(
    "SMTP configured:",
    SMTP_CONFIGURED ? "YES" : "NO"
);

console.log(
    "Resend configured:",
    RESEND_CONFIGURED ? "YES" : "NO"
);

if (SMTP_CONFIGURED) {

    console.log(
        "Primary transport: Gmail SMTP"
    );

    console.log(
        "SMTP Host:",
        SMTP_HOST
    );

    console.log(
        "SMTP Port:",
        SMTP_PORT
    );

    console.log(
        "SMTP Secure:",
        SMTP_SECURE
    );

    console.log(
        "SMTP User:",
        SMTP_USER
    );

    console.log(
        "From:",
        SMTP_USER
    );

}

else if (RESEND_CONFIGURED) {

    console.log(
        "Primary transport: Resend API"
    );

    console.log(
        "From:",
        RESEND_FROM
    );

}

else {

    console.error(
        "❌ NO EMAIL TRANSPORT IS CONFIGURED."
    );

    console.error(
        "Configure Gmail SMTP or Resend."
    );

}

console.log("==========================================");

// ==========================================================
// TRANSPORT CHECK
// ==========================================================

function getTransport() {

    // ------------------------------------------------------
    // Explicit SMTP
    // ------------------------------------------------------

    if (MAIL_TRANSPORT === "smtp") {

        if (!SMTP_CONFIGURED) {

            const error =
                new Error(
                    "SMTP transport selected but SMTP_USER or SMTP_PASS is missing."
                );

            error.code =
                "SMTP_CONFIG_ERROR";

            error.status =
                500;

            throw error;

        }

        return "smtp";
    }

    // ------------------------------------------------------
    // Explicit Resend
    // ------------------------------------------------------

    if (MAIL_TRANSPORT === "resend") {

        if (!RESEND_CONFIGURED || !resend) {

            const error =
                new Error(
                    "Resend transport selected but RESEND_API_KEY is missing."
                );

            error.code =
                "RESEND_CONFIG_ERROR";

            error.status =
                500;

            throw error;

        }

        return "resend";
    }

    // ------------------------------------------------------
    // AUTO
    // ------------------------------------------------------

    if (SMTP_CONFIGURED) {

        return "smtp";

    }

    if (RESEND_CONFIGURED) {

        return "resend";

    }

    const error =
        new Error(
            "No email transport is configured. Configure Gmail SMTP or Resend."
        );

    error.code =
        "EMAIL_TRANSPORT_NOT_CONFIGURED";

    error.status =
        500;

    throw error;
}

// ==========================================================
// EMAIL ADDRESS VALIDATION
// ==========================================================

const EMAIL_PATTERN =
    /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

// ==========================================================
// NORMALIZE RECIPIENTS
// ==========================================================

function normalizeRecipients(to) {

    if (!to) {

        const error =
            new Error(
                "Email recipient is missing."
            );

        error.code =
            "EMAIL_RECIPIENT_MISSING";

        error.status =
            400;

        throw error;
    }

    const recipients =
        Array.isArray(to)
            ? to
                .map(
                    email =>
                        String(
                            email || ""
                        )
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
            email =>
                email.length > 254 ||
                !EMAIL_PATTERN.test(email)
        )
    ) {

        const error =
            new Error(
                "Invalid recipient email address."
            );

        error.code =
            "EMAIL_RECIPIENT_INVALID";

        error.status =
            400;

        throw error;
    }

    return Array.isArray(to)
        ? recipients
        : recipients[0];
}

// ==========================================================
// NORMALIZE ATTACHMENTS FOR SMTP
// ==========================================================

function normalizeSmtpAttachments(
    attachments
) {

    if (!Array.isArray(attachments)) {

        return [];
    }

    return attachments.map(
        attachment => {

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
                    String(
                        attachment.cid
                    )
                        .replace(
                            /[<>\r\n]/g,
                            ""
                        );
            }

            if (attachment.encoding) {

                normalized.encoding =
                    attachment.encoding;
            }

            return normalized;
        }
    );
}

// ==========================================================
// NORMALIZE ATTACHMENTS FOR RESEND
// ==========================================================

function normalizeResendAttachments(
    attachments
) {

    if (!Array.isArray(attachments)) {

        return [];
    }

    return attachments.map(
        attachment => ({

            filename:
                attachment.filename ||
                "attachment",

            content:
                attachment.content,

            ...(attachment.path
                ? {
                    path:
                        attachment.path
                }
                : {}),

            ...(attachment.cid
                ? {
                    contentId:
                        String(
                            attachment.cid
                        )
                            .replace(
                                /[<>\r\n]/g,
                                ""
                            )
                }
                : {}),

            ...(attachment.contentType
                ? {
                    contentType:
                        attachment.contentType
                }
                : {})

        })
    );
}

// ==========================================================
// ERROR NORMALIZATION
// ==========================================================

function normalizeMailerError(
    error
) {

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
            normalized?.code ||
            ""
        ).toUpperCase();

    const status =
        Number(
            normalized?.statusCode ||
            normalized?.status ||
            normalized?.response?.statusCode ||
            normalized?.response?.status ||
            0
        );

    // ------------------------------------------------------
    // Gmail authentication
    // ------------------------------------------------------

    if (
        originalCode ===
            "EAUTH" ||
        /invalid login|authentication failed|username and password not accepted|application-specific password/i
            .test(
                normalized?.message ||
                ""
            )
    ) {

        normalized.code =
            "SMTP_AUTH_FAILED";

        normalized.status =
            status || 401;

        normalized.message =
            "Gmail SMTP authentication failed. Use a Gmail App Password, not the normal Gmail password.";
    }

    // ------------------------------------------------------
    // Gmail connection
    // ------------------------------------------------------

    else if (
        originalCode ===
            "ECONNECTION" ||
        originalCode ===
            "ETIMEDOUT" ||
        originalCode ===
            "ESOCKET" ||
        /connection timed out|connect econnrefused|could not connect|connection refused|socket hang up/i
            .test(
                normalized?.message ||
                ""
            )
    ) {

        normalized.code =
            "SMTP_CONNECTION_FAILED";

        normalized.status =
            status || 503;

        normalized.message =
            `Could not connect to Gmail SMTP (${SMTP_HOST}:${SMTP_PORT}). Check SMTP_HOST, SMTP_PORT, SMTP_SECURE and Render outbound SMTP access.`;
    }

    // ------------------------------------------------------
    // Gmail TLS
    // ------------------------------------------------------

    else if (
        originalCode ===
            "ESOCKET" &&
        /tls|ssl|certificate|secure/i
            .test(
                normalized?.message ||
                ""
            )
    ) {

        normalized.code =
            "SMTP_TLS_FAILED";

        normalized.status =
            status || 503;

        normalized.message =
            "Gmail SMTP TLS connection failed. Use port 587 with SMTP_SECURE=false.";
    }

    // ------------------------------------------------------
    // Resend authentication
    // ------------------------------------------------------

    else if (
        status === 401 ||
        status === 403 ||
        /api.?key|unauthoriz|forbidden/i
            .test(
                normalized?.message ||
                ""
            )
    ) {

        normalized.code =
            "RESEND_AUTH_FAILED";

        normalized.status =
            status || 401;

        normalized.message =
            "Resend authentication failed. Verify RESEND_API_KEY.";
    }

    // ------------------------------------------------------
    // Resend sender
    // ------------------------------------------------------

    else if (
        /from|sender|domain/i
            .test(
                normalized?.message ||
                ""
            ) &&
        /verify|invalid|not allowed|not authorized/i
            .test(
                normalized?.message ||
                ""
            )
    ) {

        normalized.code =
            "RESEND_SENDER_ERROR";

        normalized.status =
            status || 400;

        normalized.message =
            `Resend rejected the sender "${RESEND_FROM}". onboarding@resend.dev is only suitable for Resend's test restrictions; production arbitrary-recipient sending requires a verified sender domain.`;
    }

    else {

        normalized.status =
            normalized.status ||
            status ||
            500;
    }

    return normalized;
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

        if (transport === "smtp") {

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

            console.log(
                "From:",
                SMTP_USER
            );

            // ------------------------------------------------
            // Verify Gmail connection/authentication.
            // ------------------------------------------------

            await smtpTransporter.verify();

            console.log(
                "✅ Gmail SMTP connection verified"
            );

        }

        else {

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

        console.log("==========================================");

        return true;

    }

    catch (error) {

        const normalized =
            normalizeMailerError(
                error
            );

        console.error("==========================================");
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
        console.error("==========================================");

        return false;
    }
}

// ==========================================================
// SEND THROUGH GMAIL SMTP
// ==========================================================

async function sendThroughSmtp(
    mailOptions,
    normalizedTo
) {

    if (
        !smtpTransporter
    ) {

        const error =
            new Error(
                "Gmail SMTP transporter is not configured."
            );

        error.code =
            "SMTP_CONFIG_ERROR";

        error.status =
            500;

        throw error;
    }

    const message = {

        from:
            SMTP_USER,

        to:
            normalizedTo,

        subject:
            mailOptions.subject

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

        id:
            result.messageId,

        messageId:
            result.messageId,

        accepted:
            result.accepted,

        rejected:
            result.rejected,

        response:
            result.response,

        envelope:
            result.envelope,

        transport:
            "gmail-smtp"

    };
}

// ==========================================================
// SEND THROUGH RESEND
// ==========================================================

async function sendThroughResend(
    mailOptions,
    normalizedTo
) {

    if (
        !resend ||
        !RESEND_API_KEY
    ) {

        const error =
            new Error(
                "Resend is not configured."
            );

        error.code =
            "RESEND_CONFIG_ERROR";

        error.status =
            500;

        throw error;
    }

    const payload = {

        from:
            RESEND_FROM,

        to:
            normalizedTo,

        subject:
            mailOptions.subject

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

    const {
        data,
        error
    } =
        await resend.emails.send(
            payload
        );

    if (error) {

        const apiError =
            new Error(
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

            data:
                error

        };

        throw apiError;
    }

    return {

        ...(data || {}),

        transport:
            "resend"

    };
}

// ==========================================================
// SEND EMAIL
// ==========================================================

async function sendMail(
    mailOptions = {}
) {

    // ------------------------------------------------------
    // Recipient
    // ------------------------------------------------------

    const normalizedTo =
        normalizeRecipients(
            mailOptions.to
        );

    // ------------------------------------------------------
    // Subject
    // ------------------------------------------------------

    if (
        !mailOptions.subject
    ) {

        const error =
            new Error(
                "Email subject is missing."
            );

        error.code =
            "EMAIL_SUBJECT_MISSING";

        error.status =
            400;

        throw error;
    }

    // ------------------------------------------------------
    // Content
    // ------------------------------------------------------

    if (
        !mailOptions.html &&
        !mailOptions.text
    ) {

        const error =
            new Error(
                "Email content is missing."
            );

        error.code =
            "EMAIL_CONTENT_MISSING";

        error.status =
            400;

        throw error;
    }

    // ------------------------------------------------------
    // Transport
    // ------------------------------------------------------

    const transport =
        getTransport();

    // ------------------------------------------------------
    // Logs
    // ------------------------------------------------------

    console.log("==========================================");

    console.log(
        "📧 MI ARCUS EMAIL SEND"
    );

    console.log(
        "Transport:",
        transport === "smtp"
            ? "Gmail SMTP"
            : "Resend API"
    );

    console.log(
        "From:",
        transport === "smtp"
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

        // --------------------------------------------------
        // Gmail SMTP
        // --------------------------------------------------

        if (
            transport === "smtp"
        ) {

            result =
                await sendThroughSmtp(
                    mailOptions,
                    normalizedTo
                );
        }

        // --------------------------------------------------
        // Resend
        // --------------------------------------------------

        else {

            result =
                await sendThroughResend(
                    mailOptions,
                    normalizedTo
                );
        }

        // --------------------------------------------------
        // SUCCESS
        // --------------------------------------------------

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
            transport === "smtp"
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

    }

    catch (error) {

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
            transport === "smtp"
                ? "Gmail SMTP"
                : "Resend API"
        );

        console.error(
            "From:",
            transport === "smtp"
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
            normalizedError?.code ||
                "N/A"
        );

        console.error(
            "Status:",
            normalizedError?.status ||
                normalizedError?.statusCode ||
                "N/A"
        );

        console.error(
            "Message:",
            normalizedError?.message ||
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

    SMTP_USER,

    SMTP_HOST,

    SMTP_PORT,

    SMTP_SECURE,

    RESEND_FROM

};