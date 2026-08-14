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
        "=================================================="
    );

    console.error(
        "❌ EMAIL_USER IS NOT CONFIGURED"
    );

    console.error(
        "=================================================="
    );

}

if (!EMAIL_PASS) {

    console.error(
        "=================================================="
    );

    console.error(
        "❌ EMAIL_PASS IS NOT CONFIGURED"
    );

    console.error(
        "=================================================="
    );

}

if (!EMAIL_FROM) {

    console.error(
        "=================================================="
    );

    console.error(
        "❌ EMAIL_FROM IS NOT CONFIGURED"
    );

    console.error(
        "=================================================="
    );

}

// ==========================================================
// CREATE GMAIL TRANSPORTER
// ==========================================================

const transporter = nodemailer.createTransport({

    service: "gmail",

    auth: {

        user: EMAIL_USER,

        pass: EMAIL_PASS

    }

});

// ==========================================================
// VERIFY GMAIL CONNECTION
// ==========================================================

const verifyMailer = async () => {

    try {

        await transporter.verify();

        console.log(
            "=================================================="
        );

        console.log(
            "✅ GMAIL SMTP CONNECTION SUCCESSFUL"
        );

        console.log(
            "Email account:",
            EMAIL_USER
        );

        console.log(
            "=================================================="
        );

        return true;

    }
    catch (error) {

        console.error(
            "=================================================="
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
            "Response:",
            error?.response || "N/A"
        );

        console.error(
            "Message:",
            error?.message || error
        );

        console.error(
            "=================================================="
        );

        return false;

    }

};

// ==========================================================
// SEND MAIL
// ==========================================================

const sendMail = async (
    mailOptions = {}
) => {

    try {

        // ==================================================
        // VALIDATE EMAIL CONFIGURATION
        // ==================================================

        if (!EMAIL_USER) {

            throw new Error(
                "EMAIL_USER is missing"
            );

        }

        if (!EMAIL_PASS) {

            throw new Error(
                "EMAIL_PASS is missing"
            );

        }

        // ==================================================
        // VALIDATE RECIPIENT
        // ==================================================

        if (!mailOptions.to) {

            throw new Error(
                "Email recipient is missing"
            );

        }

        // ==================================================
        // VALIDATE SUBJECT
        // ==================================================

        if (!mailOptions.subject) {

            throw new Error(
                "Email subject is missing"
            );

        }

        // ==================================================
        // VALIDATE CONTENT
        // ==================================================

        if (
            !mailOptions.html &&
            !mailOptions.text
        ) {

            throw new Error(
                "Email content is missing"
            );

        }

        // ==================================================
        // PREPARE MAIL
        // ==================================================

        const message = {

            from:
                mailOptions.from ||
                EMAIL_FROM,

            to:
                mailOptions.to,

            subject:
                mailOptions.subject,

            html:
                mailOptions.html,

            ...(mailOptions.text
                ? {
                    text:
                        mailOptions.text
                }
                : {})

        };

        // ==================================================
        // LOG BEFORE SENDING
        // ==================================================

        console.log(
            "=================================================="
        );

        console.log(
            "📧 SENDING EMAIL USING GMAIL SMTP"
        );

        console.log(
            "From:",
            message.from
        );

        console.log(
            "To:",
            message.to
        );

        console.log(
            "Subject:",
            message.subject
        );

        console.log(
            "=================================================="
        );

        // ==================================================
        // SEND EMAIL
        // ==================================================

        const result =
            await transporter.sendMail(
                message
            );

        // ==================================================
        // SUCCESS
        // ==================================================

        console.log(
            "=================================================="
        );

        console.log(
            "✅ EMAIL SENT SUCCESSFULLY"
        );

        console.log(
            "From:",
            message.from
        );

        console.log(
            "To:",
            message.to
        );

        console.log(
            "Subject:",
            message.subject
        );

        console.log(
            "Message ID:",
            result?.messageId ||
            "N/A"
        );

        console.log(
            "Accepted:",
            result?.accepted ||
            []
        );

        console.log(
            "Rejected:",
            result?.rejected ||
            []
        );

        console.log(
            "=================================================="
        );

        // ==================================================
        // RETURN RESULT
        // ==================================================

        return result;

    }
    catch (error) {

        // ==================================================
        // EMAIL ERROR
        // ==================================================

        console.error(
            "=================================================="
        );

        console.error(
            "❌ EMAIL SENDING FAILED"
        );

        console.error(
            "From:",
            mailOptions.from ||
            EMAIL_FROM
        );

        console.error(
            "To:",
            mailOptions.to ||
            "N/A"
        );

        console.error(
            "Subject:",
            mailOptions.subject ||
            "N/A"
        );

        console.error(
            "Code:",
            error?.code ||
            "N/A"
        );

        console.error(
            "Command:",
            error?.command ||
            "N/A"
        );

        console.error(
            "Response:",
            error?.response ||
            "N/A"
        );

        console.error(
            "Response Code:",
            error?.responseCode ||
            "N/A"
        );

        console.error(
            "Message:",
            error?.message ||
            error
        );

        console.error(
            "=================================================="
        );

        // ==================================================
        // IMPORTANT
        // ==================================================
        // Re-throw the error so emailService.js and the
        // controller know that the email actually failed.
        // ==================================================

        throw error;

    }

};

// ==========================================================
// STARTUP VERIFICATION
// ==========================================================
//
// This verifies the Gmail configuration when the backend
// starts. It does NOT send an email.
// ==========================================================

if (
    EMAIL_USER &&
    EMAIL_PASS
) {

    verifyMailer();

}

// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    sendMail,

    verifyMailer

};