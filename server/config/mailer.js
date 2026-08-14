// ==========================================================
// MIARCUS MAILER
// Gmail SMTP / Nodemailer
// ==========================================================

const nodemailer = require("nodemailer");

// ==========================================================
// ENVIRONMENT VARIABLES
// ==========================================================

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

// ==========================================================
// VALIDATION
// ==========================================================

if (!EMAIL_USER) {
    console.error(
        "❌ EMAIL_USER is not configured."
    );
}

if (!EMAIL_PASS) {
    console.error(
        "❌ EMAIL_PASS is not configured."
    );
}

if (!EMAIL_FROM) {
    console.error(
        "❌ EMAIL_FROM is not configured."
    );
}

// ==========================================================
// GMAIL SMTP TRANSPORTER
// IMPORTANT:
// Port 587 + STARTTLS
// IPv4 is forced because Render was attempting IPv6
// and returning ENETUNREACH / connection timeout.
// ==========================================================

const transporter = nodemailer.createTransport({

    host: "smtp.gmail.com",

    port: 587,

    secure: false,

    requireTLS: true,

    family: 4,

    auth: {

        user: EMAIL_USER,

        pass: EMAIL_PASS

    },

    tls: {

        minVersion: "TLSv1.2",

        servername: "smtp.gmail.com"

    },

    connectionTimeout: 30000,

    greetingTimeout: 30000,

    socketTimeout: 60000

});

// ==========================================================
// VERIFY SMTP CONNECTION
// ==========================================================

const verifyMailer = async () => {

    if (!EMAIL_USER || !EMAIL_PASS) {

        console.error(
            "❌ Gmail SMTP cannot be verified."
        );

        console.error(
            "EMAIL_USER or EMAIL_PASS is missing."
        );

        return false;

    }

    try {

        console.log(
            "=========================================="
        );

        console.log(
            "📧 VERIFYING GMAIL SMTP CONNECTION"
        );

        console.log(
            "Host: smtp.gmail.com"
        );

        console.log(
            "Port: 587"
        );

        console.log(
            "Security: STARTTLS"
        );

        console.log(
            "IPv4: Enabled"
        );

        console.log(
            "From:",
            EMAIL_FROM
        );

        console.log(
            "=========================================="
        );

        await transporter.verify();

        console.log(
            "=========================================="
        );

        console.log(
            "✅ GMAIL SMTP CONNECTION SUCCESSFUL"
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
            "❌ GMAIL SMTP CONNECTION FAILED"
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

// ==========================================================
// SEND MAIL
// ==========================================================

const sendMail = async (mailOptions = {}) => {

    if (!EMAIL_USER) {

        throw new Error(
            "EMAIL_USER is missing."
        );

    }

    if (!EMAIL_PASS) {

        throw new Error(
            "EMAIL_PASS is missing."
        );

    }

    if (!mailOptions.to) {

        throw new Error(
            "Email recipient is missing."
        );

    }

    if (!mailOptions.subject) {

        throw new Error(
            "Email subject is missing."
        );

    }

    if (!mailOptions.html && !mailOptions.text) {

        throw new Error(
            "Email content is missing."
        );

    }

    try {

        console.log(
            "=========================================="
        );

        console.log(
            "📧 SENDING EMAIL USING GMAIL SMTP"
        );

        console.log(
            "From:",
            mailOptions.from || EMAIL_FROM
        );

        console.log(
            "To:",
            mailOptions.to
        );

        console.log(
            "Subject:",
            mailOptions.subject
        );

        console.log(
            "=========================================="
        );

        const result = await transporter.sendMail({

            from:
                mailOptions.from ||
                EMAIL_FROM,

            to:
                mailOptions.to,

            subject:
                mailOptions.subject,

            html:
                mailOptions.html,

            text:
                mailOptions.text

        });

        console.log(
            "=========================================="
        );

        console.log(
            "✅ EMAIL SENT SUCCESSFULLY"
        );

        console.log(
            "Message ID:",
            result?.messageId || "N/A"
        );

        console.log(
            "Accepted:",
            result?.accepted || []
        );

        console.log(
            "Rejected:",
            result?.rejected || []
        );

        console.log(
            "Response:",
            result?.response || "N/A"
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
            "❌ GMAIL SMTP EMAIL SEND FAILED"
        );

        console.error(
            "From:",
            mailOptions.from || EMAIL_FROM
        );

        console.error(
            "To:",
            mailOptions.to
        );

        console.error(
            "Subject:",
            mailOptions.subject
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
            "Response Code:",
            error?.responseCode || "N/A"
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

// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    sendMail,

    verifyMailer,

    transporter

};