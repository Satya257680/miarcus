const transporter = require("../config/mailer");
const path = require("path");

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
// Embedded Images (CID)
// ======================================================

const emailAttachments = [

    {
        filename: "Miarcus.png",
        path: path.join(__dirname, "../public/images/Miarcus.png"),
        cid: "miarcus-logo"
    },

    {
        filename: "facebook.png",
        path: path.join(__dirname, "../public/images/facebook.png"),
        cid: "facebook-icon"
    },

    {
        filename: "linkedin.png",
        path: path.join(__dirname, "../public/images/linkedin.png"),
        cid: "linkedin-icon"
    },

    {
        filename: "x.png",
        path: path.join(__dirname, "../public/images/x.png"),
        cid: "x-icon"
    },

    {
        filename: "instagram.png",
        path: path.join(__dirname, "../public/images/instagram.png"),
        cid: "instagram-icon"
    }

];

// ======================================================
// Invitation Email
// ======================================================

const sendInvitationEmail = async (user, activationLink) => {

    return transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: user.email,

        subject: "Welcome to miarcus",

        html: invitationEmail(user, activationLink),

        attachments: emailAttachments

    });

};

// ======================================================
// Account Updated
// ======================================================

const sendAccountUpdatedEmail = async (user) => {

    return transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: user.email,

        subject: "Your miarcus Account Has Been Updated",

        html: accountUpdated(user),

        attachments: emailAttachments

    });

};

// ======================================================
// Account Activated
// ======================================================

const sendAccountActivatedEmail = async (user) => {

    return transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: user.email,

        subject: "Your miarcus Account Has Been Activated",

        html: accountActivated(user),

        attachments: emailAttachments

    });

};

// ======================================================
// Account Disabled
// ======================================================

const sendAccountDisabledEmail = async (user) => {

    return transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: user.email,

        subject: "Your miarcus Account Has Been Disabled",

        html: accountDisabled(user),

        attachments: emailAttachments

    });

};

// ======================================================
// Account Enabled
// ======================================================

const sendAccountEnabledEmail = async (user) => {

    return transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: user.email,

        subject: "Your miarcus Account Has Been Reactivated",

        html: accountEnabled(user),

        attachments: emailAttachments

    });

};

// ======================================================
// Account Deleted
// ======================================================

const sendAccountDeletedEmail = async (user) => {

    return transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: user.email,

        subject: "Your miarcus Account Has Been Deleted",

        html: accountDeleted(user),

        attachments: emailAttachments

    });

};

// ======================================================
// Forgot Password OTP
// ======================================================

const sendForgotPasswordOTPEmail = async (user, otp) => {

    return transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: user.email,

        subject: "Your Password Reset OTP",

        html: forgotPasswordOTP(user, otp),

        attachments: emailAttachments

    });

};

// ======================================================
// Reset Password Confirmation
// ======================================================

const sendResetPasswordEmail = async (user) => {

    return transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: user.email,

        subject: "Your Password Has Been Reset",

        html: resetPassword(user),

        attachments: emailAttachments

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