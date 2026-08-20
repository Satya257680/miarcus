const baseTemplate = require("./baseTemplate");
const { getAppUrl } = require("../../config/appUrl");

const accountEnabled = (user) => {

    return baseTemplate({

        // ===========================
        // Page Title
        // ===========================

        title: "Account Reactivated Successfully",

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
            Welcome back to
            <strong style="color:#5F39FF;">
                miarcus
            </strong>!

            <br><br>

            Your account has been successfully reactivated by your administrator, and you can now access the platform again.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            Your account is now active and ready to use.

            <br><br>

            You can sign in using your registered email address and continue accessing the features and modules available based on your assigned role and permissions.

            <br><br>

            We recommend reviewing your account information after logging in to ensure all your profile details, department, designation, reporting manager, and permissions are correct.

            <br><br>

            If you experience any issues while signing in or notice any unexpected changes, please contact your administrator immediately.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Login to miarcus",

        buttonLink:
            getAppUrl(),

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Account Reactivation Information",

        infoBoxMessage: `
            ✓ Your account is now active and ready to use.

            <br><br>

            ✓ Any updates made to your profile, department, designation, reporting manager, role, or permissions while your account was inactive are now in effect.

            <br><br>

            ✓ Review your account information after signing in to ensure everything is accurate.

            <br><br>

            ✓ Contact your administrator immediately if you experience login issues or notice any unexpected account changes.

            <br><br>

            ✓ Keep your login credentials secure and never share your password with anyone.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            Thank you for being a valued member of
            <strong>miarcus</strong>.

            <br><br>

            We're pleased to welcome you back and look forward to supporting your continued success.

            <br><br>

            If you require any assistance, please don't hesitate to contact your administrator.

            <br><br>

            We wish you a productive and successful experience with
            <strong>miarcus</strong>.
        `,

        // ===========================
        // Options
        // ===========================

        showButton: true,

        showInfoBox: true

    });

};

module.exports = accountEnabled;