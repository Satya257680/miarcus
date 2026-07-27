const baseTemplate = require("./baseTemplate");

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
            Your password for your
            <strong style="color:#5F39FF;">
                miarcus
            </strong>
            account has been changed successfully.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            This email confirms that your password has been updated successfully.
            <br><br>

            You can now sign in to your account using your new password.

            <br><br>

            If you did not make this change, your account may have been compromised.

            <br><br>

            Please contact your administrator immediately and reset your password again to secure your account.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Login to miarcus",

        buttonLink: process.env.FRONTEND_URL,

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Security Recommendations",

        infoBoxMessage: `
            ✓ Never share your password with anyone.
            <br><br>

            ✓ Use a strong password containing uppercase letters, lowercase letters, numbers, and special characters.
            <br><br>

            ✓ Avoid using the same password across multiple websites or applications.
            <br><br>

            ✓ Change your password periodically to improve account security.
            <br><br>

            ✓ Always sign out when using a shared or public computer.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            Thank you for helping us keep your
            <strong>miarcus</strong> account secure.
            <br><br>

            If you notice any suspicious activity or have questions regarding your account, please contact your administrator immediately.
        `,

        showButton: true,

        showInfoBox: true

    });

};

module.exports = resetPassword;