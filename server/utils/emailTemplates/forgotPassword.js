const baseTemplate = require("./baseTemplate");
const { getAppUrl } = require("../../config/appUrl");

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

            <br><br>

            To help protect your account, we've generated a secure password reset link for you.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            Click the button below to create a new password for your account.

            <br><br>

            This secure password reset link will take you directly to the password reset page.

            <br><br>

            Once you've successfully created a new password, you'll be able to sign in using your updated credentials.

            <br><br>

            For your security, this password reset link is unique to your account and can only be used once.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Reset Password",

        buttonLink:
            resetLink ||
            getAppUrl(),

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Password Reset Information",

        infoBoxMessage: `
            ✓ This password reset link is valid for
            <strong>30 minutes</strong>.

            <br><br>

            ✓ This password reset link can only be used once.

            <br><br>

            ✓ Never share this password reset link with anyone.

            <br><br>

            ✓ Create a strong password using uppercase letters, lowercase letters, numbers, and special characters.

            <br><br>

            ✓ Avoid using personal information or previously used passwords.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            If you did not request this password reset, you can safely ignore this email.

            <br><br>

            Your current password will remain unchanged unless you complete the password reset process.

            <br><br>

            If you suspect unauthorized access to your account, please contact your administrator immediately.

            <br><br>

            Thank you for trusting
            <strong>miarcus</strong>
            to help keep your account secure.
        `,

        // ===========================
        // Options
        // ===========================

        showButton: true,

        showInfoBox: true

    });

};

module.exports = forgotPassword;