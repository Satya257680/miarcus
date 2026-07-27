const baseTemplate = require("./baseTemplate");

const accountActivated = (user) => {

    return baseTemplate({

        // ===========================
        // Page Title
        // ===========================

        title: "Account Activated",

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
            Welcome to
            <strong style="color:#5F39FF;">
                miarcus
            </strong>!

            <br><br>

            Your account has been successfully activated and is now ready to use.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            Congratulations! Your account has been activated successfully.

            <br><br>

            You can now sign in to the miarcus platform and access the features and modules available to you based on your assigned role and permissions.

            <br><br>

            We recommend reviewing your profile information, department, designation, and account settings after signing in to ensure everything is accurate.

            <br><br>

            We look forward to supporting you as you begin using miarcus.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Login to miarcus",

        buttonLink: process.env.FRONTEND_URL,

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Activation Successful",

        infoBoxMessage: `
            ✓ Your account has been successfully activated.

            <br><br>

            ✓ You can now sign in using your registered email address and password.

            <br><br>

            ✓ Your available modules and features are based on the permissions assigned by your administrator.

            <br><br>

            ✓ If you experience any issues signing in, please contact your administrator for assistance.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            Thank you for joining
            <strong>miarcus</strong>.

            <br><br>

            We're excited to have you on board and hope you have a productive experience using our platform. If you need any assistance, please contact your administrator.
        `,

        showButton: true,

        showInfoBox: true

    });

};

module.exports = accountActivated;