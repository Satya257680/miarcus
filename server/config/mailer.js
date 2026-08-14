// ======================================================
// MIARCUS MAILER
// Gmail SMTP / Nodemailer
// ======================================================

require("dotenv").config();

const nodemailer = require("nodemailer");

// ======================================================
// ENVIRONMENT VARIABLES
// ======================================================

const EMAIL_USER = String(
    process.env.EMAIL_USER || ""
).trim();

const EMAIL_PASS = String(
    process.env.EMAIL_PASS || ""
).trim();

const EMAIL_FROM = String(
    process.env.EMAIL_FROM ||
    EMAIL_USER
).trim();

// ======================================================
// STARTUP VALIDATION
// ======================================================

if (!EMAIL_USER) {

    console.warn(
        "⚠️ EMAIL_USER is not configured."
    );

}

if (!EMAIL_PASS) {

    console.warn(
        "⚠️ EMAIL_PASS is not configured."
    );

}

if (!EMAIL_FROM) {

    console.warn(
        "⚠️ EMAIL_FROM is not configured."
    );

}

// ======================================================
// GMAIL SMTP TRANSPORTER
// ======================================================

const transporter = nodemailer.createTransport({

    host: "smtp.gmail.com",

    port: 587,

    secure: false,

    auth: {

        user: EMAIL_USER,

        pass: EMAIL_PASS

    },

    requireTLS: true,

    tls: {

        minVersion: "TLSv1.2",

        rejectUnauthorized: false

    }

});

// ======================================================
// VERIFY SMTP CONNECTION
// ======================================================

const verifyMailer = async () => {

    if (!EMAIL_USER) {

        console.error(
            "❌ Gmail SMTP verification failed: EMAIL_USER missing."
        );

        return false;

    }

    if (!EMAIL_PASS) {

        console.error(
            "❌ Gmail SMTP verification failed: EMAIL_PASS missing."
        );

        return false;

    }

    try {

        await transporter.verify();

        console.log(
            "=========================================="
        );

        console.log(
            "✅ Gmail SMTP connection successful"
        );

        console.log(
            "📧 SMTP User:",
            EMAIL_USER
        );

        console.log(
            "📧 From:",
            EMAIL_FROM
        );

        console.log(
            "=========================================="
        );

        return true;

    }
    catch (error) {

        console.error(
            "=========================================="
        );

        console.error(
            "❌ Gmail SMTP connection failed"
        );

        console.error(
            "Code:",
            error?.code || "N/A"
        );

        console.error(
            "Command:",
            error?.command || "N/A"
        );

        console.error(
            "Message:",
            error?.message || error
        );

        console.error(
            "=========================================="
        );

        return false;

    }

};

// ======================================================
// SEND MAIL
// ======================================================

const sendMail = async (options = {}) => {

    // --------------------------------------------------
    // CHECK EMAIL USER
    // --------------------------------------------------

    if (!EMAIL_USER) {

        throw new Error(
            "EMAIL_USER is not configured."
        );

    }

    // --------------------------------------------------
    // CHECK EMAIL PASSWORD
    // --------------------------------------------------

    if (!EMAIL_PASS) {

        throw new Error(
            "EMAIL_PASS is not configured."
        );

    }

    // --------------------------------------------------
    // CHECK RECIPIENT
    // --------------------------------------------------

    if (!options.to) {

        throw new Error(
            "Recipient email is required."
        );

    }

    // --------------------------------------------------
    // CHECK SUBJECT
    // --------------------------------------------------

    if (!options.subject) {

        throw new Error(
            "Email subject is required."
        );

    }

    // --------------------------------------------------
    // EMAIL DATA
    // --------------------------------------------------

    const mailOptions = {

        from: EMAIL_FROM,

        to: options.to,

        subject: options.subject,

        html: options.html || undefined,

        text: options.text || undefined,

        cc: options.cc || undefined,

        bcc: options.bcc || undefined,

        replyTo: options.replyTo || undefined,

        attachments:
            options.attachments || undefined

    };

    // --------------------------------------------------
    // SEND EMAIL
    // --------------------------------------------------

    try {

        console.log(
            "=========================================="
        );

        console.log(
            "📧 Sending email..."
        );

        console.log(
            "From:",
            EMAIL_FROM
        );

        console.log(
            "To:",
            options.to
        );

        console.log(
            "Subject:",
            options.subject
        );

        const result =
            await transporter.sendMail(
                mailOptions
            );

        console.log(
            "✅ Email sent successfully"
        );

        console.log(
            "Message ID:",
            result.messageId
        );

        console.log(
            "Accepted:",
            result.accepted
        );

        console.log(
            "Rejected:",
            result.rejected
        );

        console.log(
            "=========================================="
        );

        return result;

    }
    catch (error) {

        console.error(
            "=========================================="
        );

        console.error(
            "❌ Email sending failed"
        );

        console.error(
            "Code:",
            error?.code || "N/A"
        );

        console.error(
            "Command:",
            error?.command || "N/A"
        );

        console.error(
            "Response:",
            error?.response || "N/A"
        );

        console.error(
            "Message:",
            error?.message || error
        );

        console.error(
            "=========================================="
        );

        throw error;

    }

};

// ======================================================
// VERIFY ON SERVER START
// ======================================================

verifyMailer();

// ======================================================
// EXPORT
// ======================================================

module.exports = {

    sendMail,

    verifyMailer,

    transporter

};