const baseTemplate = require("./baseTemplate");

const accountDeleted = (user) => {

    return baseTemplate({

        // ===========================
        // Page Title
        // ===========================

        title: "Account Deleted",

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
            account has been permanently deleted.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            Your administrator has permanently removed your account from the miarcus system.

            <br><br>

            As a result, you can no longer sign in or access any features, data, or services associated with your previous account.

            <br><br>

            If this action was unexpected or you believe it was performed in error, please contact your administrator as soon as possible for assistance.

            <br><br>

            Please note that restoring access may require your administrator to create a new account for you.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Visit miarcus",

        buttonLink: process.env.FRONTEND_URL,

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Account Deletion Information",

        infoBoxMessage: `
            ✓ Your account has been permanently removed from the system.

            <br><br>

            ✓ Your previous login credentials are no longer valid.

            <br><br>

            ✓ Future access to miarcus will require your administrator to create a new account for you.

            <br><br>

            ✓ If you believe this account deletion was made in error, please contact your administrator immediately.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            Thank you for being a part of
            <strong>miarcus</strong>.

            <br><br>

            We appreciate your time with us and wish you continued success. If you have any questions regarding your account, please contact your administrator.
        `,

        showButton: true,

        showInfoBox: true

    });

};

module.exports = accountDeleted;