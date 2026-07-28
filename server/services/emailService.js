const transporter = require("../config/mailer");

// =============================
// Email Templates
// =============================

const invitationEmail = require("../utils/emailTemplates/invitationEmail");
const accountUpdated = require("../utils/emailTemplates/accountUpdated");
const accountActivated = require("../utils/emailTemplates/accountActivated");
const accountDisabled = require("../utils/emailTemplates/accountDisabled");
const accountEnabled = require("../utils/emailTemplates/accountEnabled");
const accountDeleted = require("../utils/emailTemplates/accountDeleted");
const forgotPasswordOTP = require("../utils/emailTemplates/forgotPasswordOTP");
const resetPassword = require("../utils/emailTemplates/resetPassword");

// ======================================================
// Common Sender
// ======================================================

const EMAIL_FROM =
    process.env.EMAIL_FROM || process.env.EMAIL_USER;

// ======================================================
// Invitation Email
// ======================================================

const sendInvitationEmail = async (user, activationLink) => {

    return transporter.sendMail({

        from: EMAIL_FROM,

        to: user.email,

        subject: "Welcome to miarcus",

        html: invitationEmail(user, activationLink)

    });

};

// ======================================================
// Account Updated
// ======================================================

const sendAccountUpdatedEmail = async (user) => {

    return transporter.sendMail({

        from: EMAIL_FROM,

        to: user.email,

        subject: "Your miarcus Account Has Been Updated",

        html: accountUpdated(user)

    });

};

// ======================================================
// Account Activated
// ======================================================

const sendAccountActivatedEmail = async (user) => {

    return transporter.sendMail({

        from: EMAIL_FROM,

        to: user.email,

        subject: "Your miarcus Account Has Been Activated",

        html: accountActivated(user)

    });

};

// ======================================================
// Account Disabled
// ======================================================

const sendAccountDisabledEmail = async (user) => {

    return transporter.sendMail({

        from: EMAIL_FROM,

        to: user.email,

        subject: "Your miarcus Account Has Been Disabled",

        html: accountDisabled(user)

    });

};

// ======================================================
// Account Enabled
// ======================================================

const sendAccountEnabledEmail = async (user) => {

    return transporter.sendMail({

        from: EMAIL_FROM,

        to: user.email,

        subject: "Your miarcus Account Has Been Reactivated",

        html: accountEnabled(user)

    });

};

// ======================================================
// Account Deleted
// ======================================================

const sendAccountDeletedEmail = async (user) => {

    return transporter.sendMail({

        from: EMAIL_FROM,

        to: user.email,

        subject: "Your miarcus Account Has Been Deleted",

        html: accountDeleted(user)

    });

};

// ======================================================
// Forgot Password OTP
// ======================================================

const sendForgotPasswordOTPEmail = async (user, otp) => {

    return transporter.sendMail({

        from: EMAIL_FROM,

        to: user.email,

        subject: "Your Password Reset OTP",

        html: forgotPasswordOTP(user, otp)

    });

};

// ======================================================
// Password Reset Confirmation
// ======================================================

const sendResetPasswordEmail = async (user) => {

    return transporter.sendMail({

        from: EMAIL_FROM,

        to: user.email,

        subject: "Your Password Has Been Reset Successfully",

        html: resetPassword(user)

    });

};

// ======================================================
// Export
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