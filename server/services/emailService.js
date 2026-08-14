// ==========================================================
// MIARCUS EMAIL SERVICE
// Gmail SMTP / Nodemailer
// ==========================================================

const mailer = require("../config/mailer");

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
// COMMON SENDER
// ==========================================================

const EMAIL_FROM = String(
    process.env.EMAIL_FROM ||
    process.env.EMAIL_USER ||
    ""
).trim();

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

};

// ==========================================================
// COMMON SEND FUNCTION
// ==========================================================

const sendEmail = async ({
    to,
    subject,
    html,
    text
}) => {

    if (!to) {

        throw new Error(
            "Recipient email is required."
        );

    }

    if (!subject) {

        throw new Error(
            "Email subject is required."
        );

    }

    if (!html && !text) {

        throw new Error(
            "Email content is required."
        );

    }

    try {

        const result = await mailer.sendMail({

            from: EMAIL_FROM,

            to,

            subject,

            html,

            text

        });

        console.log(
            "=========================================="
        );

        console.log(
            "EMAIL SENT SUCCESSFULLY"
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
            result?.messageId || "N/A"
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
            "EMAIL SEND FAILED"
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
            "Error:",
            error?.message || error
        );

        console.error(
            "=========================================="
        );

        throw error;

    }

};

// ==========================================================
// USER INVITATION
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

        to: user.email,

        subject:
            "Welcome to miarcus",

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

        to: user.email,

        subject:
            "Your miarcus Account Has Been Updated",

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

        to: user.email,

        subject:
            "Your miarcus Account Has Been Activated",

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

        to: user.email,

        subject:
            "Your miarcus Account Has Been Disabled",

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

        to: user.email,

        subject:
            "Your miarcus Account Has Been Reactivated",

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

        to: user.email,

        subject:
            "Your miarcus Account Has Been Deleted",

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

        to: user.email,

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

        to: user.email,

        subject:
            "Your Password Has Been Reset Successfully",

        html:
            resetPassword(user)

    });

};

// ==========================================================
// GENERIC EMAIL
// Useful for announcements and future modules
// ==========================================================

const sendGenericEmail = async ({
    to,
    subject,
    html,
    text
}) => {

    return sendEmail({

        to,

        subject,

        html,

        text

    });

};

// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    // User invitation
    sendInvitationEmail,

    // User account lifecycle
    sendAccountUpdatedEmail,

    sendAccountActivatedEmail,

    sendAccountDisabledEmail,

    sendAccountEnabledEmail,

    sendAccountDeletedEmail,

    // Password
    sendForgotPasswordOTPEmail,

    sendResetPasswordEmail,

    // Generic email
    sendGenericEmail

};