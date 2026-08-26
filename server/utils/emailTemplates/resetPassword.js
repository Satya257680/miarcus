const baseTemplate = require("./baseTemplate");
const { getAppUrl } = require("../../config/appUrl");

const resetPassword = (user) => {

    return baseTemplate({

        // ===========================
        // Page Title
        // ===========================

        title: "Password Changed Successfully",

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
            Your
            <strong style="color:#5F39FF;">
                Mi Arcus
            </strong>
            account password has been changed successfully.

            <br><br>

            This email confirms that your password has been updated and your account is now secured with your new password.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            You can now sign in to your account using your new password.

            <br><br>

            If you made this change, no further action is required.

            <br><br>

            If you did <strong>not</strong> change your password, your account may have been compromised.

            <br><br>

            Please reset your password immediately and contact your administrator if you believe someone has gained unauthorized access to your account.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Login to Mi Arcus",

        buttonLink:
            getAppUrl(),

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Security Recommendations",

        infoBoxMessage: `
            ✓ Never share your password with anyone.

            <br><br>

            ✓ Use a strong password containing uppercase letters, lowercase letters, numbers, and special characters.

            <br><br>

            ✓ Avoid reusing passwords across multiple websites or applications.

            <br><br>

            ✓ Change your password regularly to improve account security.

            <br><br>

            ✓ Always sign out when using a shared or public computer.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            Thank you for helping us keep your
            <strong>Mi Arcus</strong>
            account secure.

            <br><br>

            If you notice any suspicious activity or require assistance, please contact your administrator immediately.
        `,

        showButton: true,

        showInfoBox: true,

    });

};

module.exports = resetPassword;