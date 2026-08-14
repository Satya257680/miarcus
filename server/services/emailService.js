const mailer = require("../config/mailer");

// ======================================================
// EMAIL TEMPLATES
// ======================================================

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


// ======================================================
// EMAIL CONFIGURATION
// ======================================================

const EMAIL_FROM = String(
    process.env.EMAIL_FROM || ""
).trim();


// ======================================================
// COMMON EMAIL SENDER
// ======================================================

const sendEmail = async ({
    to,
    subject,
    html
}) => {

    // --------------------------------------------------
    // Validate recipient
    // --------------------------------------------------

    if (!to) {

        throw new Error(
            "Recipient email address is required."
        );

    }


    // --------------------------------------------------
    // Validate sender
    // --------------------------------------------------

    if (!EMAIL_FROM) {

        throw new Error(
            "EMAIL_FROM environment variable is not configured."
        );

    }


    // --------------------------------------------------
    // Validate content
    // --------------------------------------------------

    if (!html) {

        throw new Error(
            "Email HTML content is required."
        );

    }


    try {

        console.log(
            "------------------------------------------"
        );

        console.log(
            "📧 Sending MIARCUS email"
        );

        console.log(
            "📧 From:",
            EMAIL_FROM
        );

        console.log(
            "📧 To:",
            to
        );

        console.log(
            "📧 Subject:",
            subject
        );


        // ------------------------------------------------
        // Send through central mailer
        // ------------------------------------------------

        const result = await mailer.sendMail({

            from: EMAIL_FROM,

            to: String(to).trim(),

            subject: String(subject || "").trim(),

            html

        });


        // ------------------------------------------------
        // Success
        // ------------------------------------------------

        console.log(
            "✅ MIARCUS email sent successfully"
        );

        if (result?.messageId) {

            console.log(
                "📧 Message ID:",
                result.messageId
            );

        }

        if (result?.id) {

            console.log(
                "📧 Email ID:",
                result.id
            );

        }

        console.log(
            "------------------------------------------"
        );


        return result;

    }
    catch (error) {

        // ------------------------------------------------
        // Detailed error logging
        // ------------------------------------------------

        console.error(
            "------------------------------------------"
        );

        console.error(
            "❌ MIARCUS EMAIL FAILED"
        );

        console.error(
            "❌ From:",
            EMAIL_FROM
        );

        console.error(
            "❌ To:",
            to
        );

        console.error(
            "❌ Subject:",
            subject
        );

        console.error(
            "❌ Error:",
            error?.message || error
        );

        if (error?.code) {

            console.error(
                "❌ Error Code:",
                error.code
            );

        }

        if (error?.statusCode) {

            console.error(
                "❌ Status Code:",
                error.statusCode
            );

        }

        if (error?.response) {

            console.error(
                "❌ Response:",
                error.response
            );

        }

        console.error(
            "------------------------------------------"
        );


        // ------------------------------------------------
        // Re-throw so controller can handle it
        // ------------------------------------------------

        throw error;

    }

};


// ======================================================
// INVITATION EMAIL
// ======================================================

const sendInvitationEmail = async (
    user,
    activationLink
) => {

    if (!user) {

        throw new Error(
            "User information is required for invitation email."
        );

    }


    if (!user.email) {

        throw new Error(
            "User email is required for invitation email."
        );

    }


    if (!activationLink) {

        throw new Error(
            "Activation link is required for invitation email."
        );

    }


    return sendEmail({

        to: user.email,

        subject: "Welcome to miarcus",

        html: invitationEmail(
            user,
            activationLink
        )

    });

};


// ======================================================
// ACCOUNT UPDATED EMAIL
// ======================================================

const sendAccountUpdatedEmail = async (
    user
) => {

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


    return sendEmail({

        to: user.email,

        subject:
            "Your miarcus Account Has Been Updated",

        html:
            accountUpdated(user)

    });

};


// ======================================================
// ACCOUNT ACTIVATED EMAIL
// ======================================================

const sendAccountActivatedEmail = async (
    user
) => {

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


    return sendEmail({

        to: user.email,

        subject:
            "Your miarcus Account Has Been Activated",

        html:
            accountActivated(user)

    });

};


// ======================================================
// ACCOUNT DISABLED EMAIL
// ======================================================

const sendAccountDisabledEmail = async (
    user
) => {

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


    return sendEmail({

        to: user.email,

        subject:
            "Your miarcus Account Has Been Disabled",

        html:
            accountDisabled(user)

    });

};


// ======================================================
// ACCOUNT ENABLED EMAIL
// ======================================================

const sendAccountEnabledEmail = async (
    user
) => {

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


    return sendEmail({

        to: user.email,

        subject:
            "Your miarcus Account Has Been Reactivated",

        html:
            accountEnabled(user)

    });

};


// ======================================================
// ACCOUNT DELETED EMAIL
// ======================================================

const sendAccountDeletedEmail = async (
    user
) => {

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


    return sendEmail({

        to: user.email,

        subject:
            "Your miarcus Account Has Been Deleted",

        html:
            accountDeleted(user)

    });

};


// ======================================================
// FORGOT PASSWORD OTP EMAIL
// ======================================================

const sendForgotPasswordOTPEmail = async (
    user,
    otp
) => {

    if (!user) {

        throw new Error(
            "User information is required for OTP email."
        );

    }


    if (!user.email) {

        throw new Error(
            "User email is required for OTP email."
        );

    }


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


// ======================================================
// PASSWORD RESET CONFIRMATION EMAIL
// ======================================================

const sendResetPasswordEmail = async (
    user
) => {

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


    return sendEmail({

        to: user.email,

        subject:
            "Your Password Has Been Reset Successfully",

        html:
            resetPassword(user)

    });

};


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    sendInvitationEmail,

    sendAccountUpdatedEmail,

    sendAccountActivatedEmail,

    sendAccountDisabledEmail,

    sendAccountEnabledEmail,

    sendAccountDeletedEmail,

    sendForgotPasswordOTPEmail,

    sendResetPasswordEmail

};