const baseTemplate = require("./baseTemplate");

const accountDisabled = (user) => {

    return baseTemplate({

        // ===========================
        // Page Title
        // ===========================

        title: "Account Disabled",

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
                miarcus
            </strong>
            account has been temporarily disabled.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            Your administrator has temporarily disabled your account.

            <br><br>

            As a result, you will no longer be able to sign in or access the miarcus system until your account has been reactivated.

            <br><br>

            This action may have been taken due to administrative, security, or organizational reasons.

            <br><br>

            If you believe this action was taken in error or you require additional information, please contact your administrator.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Contact Administrator",

        buttonLink: process.env.FRONTEND_URL,

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Account Status",

        infoBoxMessage: `
            ✓ Your account is currently inactive and cannot be used to sign in.

            <br><br>

            ✓ Once your administrator reactivates your account, you will regain access to the system.

            <br><br>

            ✓ Any changes made to your profile or permissions while your account is disabled will take effect when your account is reactivated.

            <br><br>

            ✓ If you have any questions regarding your account status, please contact your administrator.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            Thank you for your understanding.

            <br><br>

            If you require assistance or believe this account status is incorrect, please contact your administrator for further support.
        `,

        showButton: true,

        showInfoBox: true

    });

};

module.exports = accountDisabled;