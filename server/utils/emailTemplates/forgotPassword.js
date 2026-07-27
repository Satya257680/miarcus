const baseTemplate = require("./baseTemplate");

const forgotPassword = (user, resetLink) => {

    return baseTemplate({

        // ===========================
        // Page Title
        // ===========================

        title: "Reset Your Password",

        // ===========================
        // Greeting
        // ===========================

        greeting: `
            Hello
            <span style="color:#5F39FF;font-weight:bold;">
                ${user.fullName || user.name}
            </span>,
        `,

        // ===========================
        // Intro
        // ===========================

        intro: `
            We received a request to reset the password for your
            <strong style="color:#5F39FF;">
                miarcus
            </strong>
            account.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            To create a new password, click the button below.

            <br><br>

            This secure password reset link will take you to the password reset page, where you can create a new password for your account.

            <br><br>

            For your security, this link is unique to your account and can only be used once.

            <br><br>

            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged unless the reset process is completed.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Reset Password",

        buttonLink: resetLink,

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Password Reset Information",

        infoBoxMessage: `
            ✓ This password reset link is valid for
            <strong>30 minutes</strong>.

            <br><br>

            ✓ This link can only be used once.

            <br><br>

            ✓ Never share this password reset link with anyone.

            <br><br>

            ✓ If the link expires, you can request a new password reset at any time.

            <br><br>

            ✓ Choose a strong password containing uppercase letters, lowercase letters, numbers, and special characters.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            If you did not request a password reset, no further action is required.

            <br><br>

            If you believe someone is attempting to access your account without your permission, please contact your administrator immediately.
        `,

        showButton: true,

        showInfoBox: true

    });

};

module.exports = forgotPassword;