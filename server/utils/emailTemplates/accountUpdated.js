const baseTemplate = require("./baseTemplate");

const accountUpdated = (user) => {

    return baseTemplate({

        // ===========================
        // Page Title
        // ===========================

        title: "Account Updated",

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
            account information has been updated successfully.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            Your administrator has updated your account information.

            <br><br>

            These updates may include changes to your profile details, department, designation, role, permissions, or other account settings.

            <br><br>

            Please sign in to your miarcus account to review the updated information and ensure everything is correct.

            <br><br>

            If you notice any unexpected changes, please contact your administrator as soon as possible.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Login to miarcus",

        buttonLink: process.env.FRONTEND_URL,

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Account Update Information",

        infoBoxMessage: `
            ✓ Your profile information, department, designation, role, or permissions may have been updated.

            <br><br>

            ✓ Some changes may affect the features or modules you can access.

            <br><br>

            ✓ Review your account after signing in to ensure all information is accurate.

            <br><br>

            ✓ If you believe any changes were made in error, please contact your administrator immediately.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            Thank you for using
            <strong>miarcus</strong>.

            <br><br>

            If you have any questions regarding these updates or require assistance, please contact your administrator.
        `,

        showButton: true,

        showInfoBox: true

    });

};

module.exports = accountUpdated;