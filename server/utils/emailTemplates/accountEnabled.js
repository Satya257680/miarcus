const baseTemplate = require("./baseTemplate");

const accountEnabled = (user) => {

    return baseTemplate({

        // ===========================
        // Page Title
        // ===========================

        title: "Account Reactivated",

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
            Great news!

            <br><br>

            Your
            <strong style="color:#5F39FF;">
                miarcus
            </strong>
            account has been successfully reactivated.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            Your administrator has restored access to your account.

            <br><br>

            You can now sign in and continue using all the features and modules available to you based on your assigned role and permissions.

            <br><br>

            We recommend reviewing your account information after logging in to ensure everything is up to date.

            <br><br>

            If you experience any issues while signing in, please contact your administrator for assistance.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Login to miarcus",

        buttonLink: process.env.FRONTEND_URL,

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Account Reactivation Information",

        infoBoxMessage: `
            ✓ Your account is now active and ready to use.

            <br><br>

            ✓ Any updates made to your profile, role, department, or permissions while your account was inactive will now take effect.

            <br><br>

            ✓ Review your account information after signing in.

            <br><br>

            ✓ If you notice any unexpected changes or experience login issues, please contact your administrator immediately.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            Welcome back to
            <strong>miarcus</strong>!

            <br><br>

            We're pleased to have you back. If you need any assistance, please don't hesitate to contact your administrator.
        `,

        showButton: true,

        showInfoBox: true

    });

};

module.exports = accountEnabled;