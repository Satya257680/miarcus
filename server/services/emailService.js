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
// EMAIL CONFIGURATION VALIDATION
// ==========================================================

if (!EMAIL_FROM) {

    console.error(
        "=================================================="
    );

    console.error(
        "❌ EMAIL_FROM / EMAIL_USER IS NOT CONFIGURED"
    );

    console.error(
        "Email sending will not work."
    );

    console.error(
        "=================================================="
    );

}

// ==========================================================
// COMMON USER EMAIL VALIDATION
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

    const email =
        String(user.email).trim();

    if (!email) {

        throw new Error(
            "User email is empty."
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

    // ======================================================
    // VALIDATE RECIPIENT
    // ======================================================

    if (!to) {

        throw new Error(
            "Recipient email is required."
        );

    }

    // ======================================================
    // VALIDATE SUBJECT
    // ======================================================

    if (!subject) {

        throw new Error(
            "Email subject is required."
        );

    }

    // ======================================================
    // VALIDATE CONTENT
    // ======================================================

    if (!html && !text) {

        throw new Error(
            "Email content is required."
        );

    }

    // ======================================================
    // VALIDATE SENDER
    // ======================================================

    if (!EMAIL_FROM) {

        throw new Error(
            "EMAIL_FROM or EMAIL_USER is not configured."
        );

    }

    // ======================================================
    // SEND EMAIL
    // ======================================================

    try {

        console.log(
            "=================================================="
        );

        console.log(
            "📧 MIARCUS EMAIL SERVICE"
        );

        console.log(
            "Sending email using Gmail SMTP..."
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
            "=================================================="
        );

        const result =
            await mailer.sendMail({

                from:
                    EMAIL_FROM,

                to,

                subject,

                html,

                ...(text
                    ? {
                        text
                    }
                    : {})

            });

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
            "❌ EMAIL SEND FAILED"
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
            "Command:",
            error?.command ||
            "N/A"
        );

        console.error(
            "Response Code:",
            error?.responseCode ||
            "N/A"
        );

        console.error(
            "Response:",
            error?.response ||
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
        // Re-throw the error so the controller knows that
        // the email failed.
        // ==================================================

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

        to:
            user.email,

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

        to:
            user.email,

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

        to:
            user.email,

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

        to:
            user.email,

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

        to:
            user.email,

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

        to:
            user.email,

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
// Used by Announcements and future modules
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

    // ======================================================
    // USER INVITATION
    // ======================================================

    sendInvitationEmail,

    // ======================================================
    // USER ACCOUNT LIFECYCLE
    // ======================================================

    sendAccountUpdatedEmail,

    sendAccountActivatedEmail,

    sendAccountDisabledEmail,

    sendAccountEnabledEmail,

    sendAccountDeletedEmail,

    // ======================================================
    // PASSWORD
    // ======================================================

    sendForgotPasswordOTPEmail,

    sendResetPasswordEmail,

    // ======================================================
    // GENERIC / ANNOUNCEMENTS
    // ======================================================

    sendGenericEmail

};