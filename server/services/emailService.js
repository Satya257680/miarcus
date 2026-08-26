// ==========================================================
// MIARCUS EMAIL SERVICE
// Gmail API / OAuth2
// ==========================================================

const mailer = require("../config/mailer");
const path = require("path");
const fs = require("fs");

// ==========================================================
// EMAIL TEMPLATES
// ==========================================================

const invitationEmail = require(
    "../utils/emailTemplates/invitationEmail"
);

const accountUpdated = require(
    "../utils/emailTemplates/accountUpdated"
);

const accountActivated = require(
    "../utils/emailTemplates/accountActivated"
);

const accountDisabled = require(
    "../utils/emailTemplates/accountDisabled"
);

const accountEnabled = require(
    "../utils/emailTemplates/accountEnabled"
);

const accountDeleted = require(
    "../utils/emailTemplates/accountDeleted"
);

const forgotPasswordOTP = require(
    "../utils/emailTemplates/forgotPasswordOTP"
);

const resetPassword = require(
    "../utils/emailTemplates/resetPassword"
);

// ==========================================================
// EMAIL CONFIGURATION
// ==========================================================
//
// Gmail OAuth2 is handled inside:
// ../config/mailer.js
//
// EMAIL_FROM is the Gmail account that sends the emails.
//
// Example:
// EMAIL_FROM=nayaksatyajit372@gmail.com
//
// ==========================================================

const EMAIL_FROM = String(
    process.env.EMAIL_FROM || ""
).trim();

// ==========================================================
// INLINE MI ARCUS BRANDING
// ==========================================================
// Keep the logo inside the email itself. This avoids broken
// logos in Gmail caused by backend/static-image URL changes.
// ==========================================================

const MI_ARCUS_LOGO_CID = "miarcus-logo@miarcus";

const MI_ARCUS_LOGO_PATH = path.join(
    __dirname,
    "../public/MiArcus-brand-theme.png"
);

const buildBrandedHtml = (html) => {

    if (!html) return html;

    const source = String(html);

    // Templates such as baseTemplate/announcementEmail already
    // contain the inline logo. Do not duplicate it.
    if (source.includes(`cid:${MI_ARCUS_LOGO_CID}`)) {
        return source;
    }

    const logoHeader = `
        <div style="background:#b8dce4;padding:24px 20px;text-align:center;">
            <img src="cid:${MI_ARCUS_LOGO_CID}" alt="Mi Arcus" width="110" style="display:inline-block;width:110px;max-width:110px;height:auto;border:0;outline:none;text-decoration:none;">
        </div>
    `;

    // Preserve existing generic email markup while adding the logo
    // at the top.
    if (/<body\b[^>]*>/i.test(source)) {
        return source.replace(/(<body\b[^>]*>)/i, `$1${logoHeader}`);
    }

    return logoHeader + source;
};

const buildEmailAttachments = (attachments) => {

    const list = Array.isArray(attachments)
        ? [...attachments]
        : [];

    // Do not add a duplicate CID attachment if a caller already did.
    const hasLogo = list.some(
        (attachment) =>
            attachment &&
            String(attachment.cid || "") === MI_ARCUS_LOGO_CID
    );

    if (!hasLogo && fs.existsSync(MI_ARCUS_LOGO_PATH)) {
        list.push({
            filename: "Mi-Arcus-logo.png",
            path: MI_ARCUS_LOGO_PATH,
            cid: MI_ARCUS_LOGO_CID,
            contentType: "image/png"
        });
    }

    return list;
};

// ==========================================================
// COMMON VALIDATION
// ==========================================================

const validateUserEmail = (user) => {

    if (!user) {

        throw new Error(
            "User information is required."
        );

    }

    if (!user.email) {

        throw new Error(
            "User email is required."
        );

    }

    const email = String(
        user.email
    ).trim();

    if (!email) {

        throw new Error(
            "User email is required."
        );

    }

};

// ==========================================================
// COMMON EMAIL SEND FUNCTION
// ==========================================================
//
// Every Miarcus email goes through this function.
//
// Gmail OAuth2 authentication is handled by:
// server/config/mailer.js
//
// ==========================================================

const sendEmail = async ({
    to,
    subject,
    html,
    text,
    attachments
}) => {

    // ------------------------------------------------------
    // Validate recipient
    // ------------------------------------------------------

    if (!to) {

        throw new Error(
            "Recipient email is required."
        );

    }

    // ------------------------------------------------------
    // Validate subject
    // ------------------------------------------------------

    if (!subject) {

        throw new Error(
            "Email subject is required."
        );

    }

    // ------------------------------------------------------
    // Validate content
    // ------------------------------------------------------

    if (!html && !text) {

        throw new Error(
            "Email content is required."
        );

    }

    // ------------------------------------------------------
    // Validate sender
    // ------------------------------------------------------

    if (!EMAIL_FROM) {

        throw new Error(
            "EMAIL_FROM is not configured."
        );

    }

    try {

        console.log(
            "=========================================="
        );

        console.log(
            "📧 MI ARCUS EMAIL SERVICE"
        );

        console.log(
            "Authentication: Gmail OAuth2"
        );

        console.log(
            "From:",
            EMAIL_FROM
        );

        console.log(
            "To:",
            to
        );

        console.log(
            "Subject:",
            subject
        );

        console.log(
            "=========================================="
        );

        // --------------------------------------------------
        // SEND THROUGH GMAIL OAUTH2 MAILER
        // --------------------------------------------------

        const result = await mailer.sendMail({

            from:
                EMAIL_FROM,

            to:
                to,

            subject:
                subject,

            html:
                buildBrandedHtml(html),

            text:
                text,

            attachments:
                buildEmailAttachments(attachments)

        });

        // --------------------------------------------------
        // SUCCESS LOG
        // --------------------------------------------------

        console.log(
            "=========================================="
        );

        console.log(
            "✅ MI ARCUS EMAIL SENT SUCCESSFULLY"
        );

        console.log(
            "From:",
            EMAIL_FROM
        );

        console.log(
            "To:",
            to
        );

        console.log(
            "Subject:",
            subject
        );

        console.log(
            "Message ID:",
            result?.id ||
            result?.messageId ||
            "N/A"
        );

        console.log(
            "=========================================="
        );

        return result;

    }
    catch (error) {

        // --------------------------------------------------
        // EMAIL ERROR
        // --------------------------------------------------

        console.error(
            "=========================================="
        );

        console.error(
            "❌ MI ARCUS EMAIL SEND FAILED"
        );

        console.error(
            "From:",
            EMAIL_FROM
        );

        console.error(
            "To:",
            to
        );

        console.error(
            "Subject:",
            subject
        );

        console.error(
            "Error Code:",
            error?.code ||
            "N/A"
        );

        console.error(
            "Status:",
            error?.response?.status ||
            error?.statusCode ||
            "N/A"
        );

        console.error(
            "Error Message:",
            error?.message ||
            error
        );

        if (error?.response?.data) {

            console.error(
                "Google API Response:",
                JSON.stringify(
                    error.response.data,
                    null,
                    2
                )
            );

        }

        console.error(
            "=========================================="
        );

        throw error;

    }

};

// ==========================================================
// USER INVITATION
// ==========================================================
//
// Used when a new user is created and an invitation
// activation link needs to be sent.
//
// ==========================================================

const sendInvitationEmail = async (
    user,
    activationLink
) => {

    validateUserEmail(user);

    if (!activationLink) {

        throw new Error(
            "Activation link is required."
        );

    }

    return sendEmail({

        to:
            user.email,

        subject:
            "Welcome to Mi Arcus",

        html:
            invitationEmail(
                user,
                activationLink
            )

    });

};

// ==========================================================
// ACCOUNT UPDATED
// ==========================================================

const sendAccountUpdatedEmail = async (
    user
) => {

    validateUserEmail(user);

    return sendEmail({

        to:
            user.email,

        subject:
            "Your Mi Arcus Account Has Been Updated",

        html:
            accountUpdated(user)

    });

};

// ==========================================================
// ACCOUNT ACTIVATED
// ==========================================================

const sendAccountActivatedEmail = async (
    user
) => {

    validateUserEmail(user);

    return sendEmail({

        to:
            user.email,

        subject:
            "Your Mi Arcus Account Has Been Activated",

        html:
            accountActivated(user)

    });

};

// ==========================================================
// ACCOUNT DISABLED
// ==========================================================

const sendAccountDisabledEmail = async (
    user
) => {

    validateUserEmail(user);

    return sendEmail({

        to:
            user.email,

        subject:
            "Your Mi Arcus Account Has Been Disabled",

        html:
            accountDisabled(user)

    });

};

// ==========================================================
// ACCOUNT ENABLED
// ==========================================================

const sendAccountEnabledEmail = async (
    user
) => {

    validateUserEmail(user);

    return sendEmail({

        to:
            user.email,

        subject:
            "Your Mi Arcus Account Has Been Reactivated",

        html:
            accountEnabled(user)

    });

};

// ==========================================================
// ACCOUNT DELETED
// ==========================================================

const sendAccountDeletedEmail = async (
    user
) => {

    validateUserEmail(user);

    return sendEmail({

        to:
            user.email,

        subject:
            "Your Mi Arcus Account Has Been Deleted",

        html:
            accountDeleted(user)

    });

};

// ==========================================================
// FORGOT PASSWORD OTP
// ==========================================================

const sendForgotPasswordOTPEmail = async (
    user,
    otp
) => {

    validateUserEmail(user);

    if (!otp) {

        throw new Error(
            "OTP is required."
        );

    }

    return sendEmail({

        to:
            user.email,

        subject:
            "Your Password Reset OTP",

        html:
            forgotPasswordOTP(
                user,
                otp
            )

    });

};

// ==========================================================
// PASSWORD RESET CONFIRMATION
// ==========================================================

const sendResetPasswordEmail = async (
    user
) => {

    validateUserEmail(user);

    return sendEmail({

        to:
            user.email,

        subject:
            "Your Password Has Been Reset Successfully",

        html:
            resetPassword(user)

    });

};

// ==========================================================
// GENERIC EMAIL
// ==========================================================
//
// Useful for announcements and future modules.
//
// Example:
//
// await sendGenericEmail({
//     to: "user@gmail.com",
//     subject: "Announcement",
//     html: "<h1>Hello</h1>"
// });
//
// ==========================================================

const sendGenericEmail = async ({
    to,
    subject,
    html,
    text,
    attachments
}) => {

    return sendEmail({

        to,

        subject,

        html,

        text,

        attachments

    });

};

// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    // ------------------------------------------------------
    // User invitation
    // ------------------------------------------------------

    sendInvitationEmail,

    // ------------------------------------------------------
    // User account lifecycle
    // ------------------------------------------------------

    sendAccountUpdatedEmail,

    sendAccountActivatedEmail,

    sendAccountDisabledEmail,

    sendAccountEnabledEmail,

    sendAccountDeletedEmail,

    // ------------------------------------------------------
    // Password
    // ------------------------------------------------------

    sendForgotPasswordOTPEmail,

    sendResetPasswordEmail,

    // ------------------------------------------------------
    // Generic email
    // ------------------------------------------------------

    sendGenericEmail

};