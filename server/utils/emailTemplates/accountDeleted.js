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
            account has been permanently deleted by your administrator.

            <br><br>

            This means your access to the platform has been permanently removed.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            Your account has been permanently removed from the
            <strong>miarcus</strong>
            system.

            <br><br>

            You can no longer sign in or access any features, modules, data, or services associated with your previous account.

            <br><br>

            Your previous login credentials are no longer valid and cannot be used to access the platform.

            <br><br>

            If this action was unexpected or you believe it was performed in error, please contact your administrator as soon as possible.

            <br><br>

            If access is required again in the future, your administrator will need to create a new account for you.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Visit miarcus",

        buttonLink:
            process.env.FRONTEND_URL ||
            "https://miarcus.com/",

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Account Deletion Information",

        infoBoxMessage: `
            ✓ Your account has been permanently removed from the system.

            <br><br>

            ✓ Your previous login credentials are no longer valid.

            <br><br>

            ✓ All access to
            <strong>miarcus</strong>
            has been revoked.

            <br><br>

            ✓ A new account must be created by your administrator if future access is required.

            <br><br>

            ✓ If you believe this account deletion was made in error, please contact your administrator immediately.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            Thank you for being a valued member of
            <strong>miarcus</strong>.

            <br><br>

            We appreciate the time you spent using our platform and wish you continued success in your future endeavors.

            <br><br>

            If you have any questions regarding your account deletion or require further assistance, please contact your administrator.

            <br><br>

            Thank you for choosing
            <strong>miarcus</strong>.
        `,

        // ===========================
        // Options
        // ===========================

        showButton: true,

        showInfoBox: true

    });

};

module.exports = accountDeleted;