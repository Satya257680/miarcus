// ==========================================================
// MIARCUS EMAIL SERVICE
// Resend API
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
// Resend is handled inside:
// ../config/mailer.js
//
// The sender is configured with RESEND_FROM.
// For free/test sending use onboarding@resend.dev,
// or use an address on a verified Resend domain.
//
// ==========================================================

const EMAIL_FROM = String(
    process.env.RESEND_FROM ||
    "onboarding@resend.dev"
).trim();

// ==========================================================
// MI ARCUS INLINE EMAIL BRANDING
// ==========================================================
// The logo is embedded as an inline MIME resource so Gmail renders it
// in the template header instead of showing it as a downloadable attachment.

const MI_ARCUS_LOGO_CID = "miarcus-logo@miarcus";
const MI_ARCUS_LOGO_PATH = path.join(
    __dirname,
    "../public/MiArcus-brand-theme.png"
);

const normalizeBrandLogoHtml = (html = "") => {

    const value = String(html);

    // Replace any old/public URL references to the brand logo with the
    // inline CID used by the MIME message. This also protects older
    // templates that still point at /images/MiArcus-brand-theme.png.
    return value
        .replace(
            /https?:\/\/[^\s"'<>]+\/images\/MiArcus-brand-theme\.png(?:\?[^\s"'<>]*)?/gi,
            `cid:${MI_ARCUS_LOGO_CID}`
        )
        .replace(
            /(?:https?:\/\/[^\s"'<>]+)?\/images\/MiArcus-brand-theme\.png(?:\?[^\s"'<>]*)?/gi,
            `cid:${MI_ARCUS_LOGO_CID}`
        )
        .replace(
            /https?:\/\/[^\s"'<>]+\/MiArcus-brand-theme\.png(?:\?[^\s"'<>]*)?/gi,
            `cid:${MI_ARCUS_LOGO_CID}`
        );
};

const getBrandAttachments = () => {

    if (!fs.existsSync(MI_ARCUS_LOGO_PATH)) {
        throw new Error(
            `Mi Arcus email logo not found at ${MI_ARCUS_LOGO_PATH}`
        );
    }

    return [{
        filename: "Mi-Arcus.png",
        contentType: "image/png",
        content: fs.readFileSync(MI_ARCUS_LOGO_PATH),
        cid: MI_ARCUS_LOGO_CID,
        disposition: "inline"
    }];
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
// Resend API authentication and sender configuration are handled by:
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

    const recipients = Array.isArray(to)
        ? to
            .map((email) => String(email || "").trim().toLowerCase())
            .filter(Boolean)
        : [String(to).trim().toLowerCase()];

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
        throw new Error(
            "Invalid recipient email address."
        );
    }

    const normalizedTo = Array.isArray(to)
        ? recipients
        : recipients[0];

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
            "Transport: Resend API"
        );

        console.log(
            "From:",
            EMAIL_FROM
        );

        console.log(
            "To:",
            normalizedTo
        );

        console.log(
            "Subject:",
            subject
        );

        console.log(
            "=========================================="
        );

        // --------------------------------------------------
        // SEND THROUGH RESEND API
        // --------------------------------------------------

        const suppliedAttachments =
            Array.isArray(attachments)
                ? attachments
                : [];

        const hasBrandLogo = suppliedAttachments.some(
            attachment =>
                attachment &&
                String(attachment.cid || "").replace(/[<>]/g, "") === MI_ARCUS_LOGO_CID
        );

        const emailAttachments = hasBrandLogo
            ? suppliedAttachments
            : [
                ...getBrandAttachments(),
                ...suppliedAttachments
            ];

        const normalizedHtml = normalizeBrandLogoHtml(html);

        const result = await mailer.sendMail({

            to:
                normalizedTo,

            subject:
                subject,

            html:
                normalizedHtml,

            text:
                text,

            attachments:
                emailAttachments

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
            normalizedTo
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
            normalizedTo
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
                "Resend API Response:",
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