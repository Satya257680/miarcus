const baseTemplate = require("./baseTemplate");
const { getAppUrl } = require("../../config/appUrl");

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
                Mi Arcus
            </strong>
            account has been temporarily disabled by your administrator.

            <br><br>

            As a result, you are currently unable to access the platform until your account is reactivated.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            Your account has been placed in an inactive status.

            <br><br>

            While your account remains disabled, you will not be able to sign in or access any
            <strong>Mi Arcus</strong>
            features, modules, or services.

            <br><br>

            This action may have been taken for administrative, organizational, or security reasons.

            <br><br>

            If you believe your account was disabled by mistake or you require additional information, please contact your administrator for assistance.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Visit Mi Arcus",

        buttonLink:
            getAppUrl(),

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Account Status Information",

        infoBoxMessage: `
            ✓ Your account is currently inactive and cannot be used to sign in.

            <br><br>

            ✓ Once your administrator reactivates your account, your access will be restored.

            <br><br>

            ✓ Any updates made to your profile, department, designation, reporting manager, role, or permissions while your account is disabled will automatically take effect when your account is reactivated.

            <br><br>

            ✓ If you have any questions regarding your account status, please contact your administrator.

            <br><br>

            ✓ For your security, never share your account credentials with anyone.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            Thank you for your understanding.

            <br><br>

            We appreciate your patience while your account remains inactive.

            <br><br>

            If you require assistance or believe this account status is incorrect, please contact your administrator for further support.

            <br><br>

            We look forward to welcoming you back to
            <strong>Mi Arcus</strong>
            once your account has been reactivated.
        `,

        // ===========================
        // Options
        // ===========================

        showButton: true,

        showInfoBox: true

    });

};

module.exports = accountDisabled;