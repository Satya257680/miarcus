const baseTemplate = require("./baseTemplate");

const accountUpdated = (user) => {

    return baseTemplate({

        // ===========================
        // Page Title
        // ===========================

        title: "Account Updated Successfully",

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

            <br><br>

            Your administrator has made changes to your account settings and profile information.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            Your account has been updated successfully.

            <br><br>

            These updates may include changes to your profile details, department, designation, reporting manager, permissions, role, or other account settings.

            <br><br>

            Please sign in to your account to review the updated information and ensure everything is correct.

            <br><br>

            If you notice any information that appears incorrect or unexpected, please contact your administrator immediately.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Login to miarcus",

        buttonLink:
            process.env.FRONTEND_URL ||
            "https://miarcus.com/",

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Account Update Information",

        infoBoxMessage: `
            ✓ Your profile information, department, designation, reporting manager, permissions, or role may have been updated.

            <br><br>

            ✓ Some updates may change the features and modules you can access.

            <br><br>

            ✓ Please review your account after signing in to ensure all information is accurate.

            <br><br>

            ✓ If any information appears incorrect or unfamiliar, contact your administrator immediately.

            <br><br>

            ✓ Keep your account information and password secure at all times.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            Thank you for using
            <strong>miarcus</strong>.

            <br><br>

            We are committed to providing you with a secure and reliable platform.

            <br><br>

            If you have any questions regarding these updates or require assistance, please contact your administrator.
        `,

        // ===========================
        // Options
        // ===========================

        showButton: true,

        showInfoBox: true

    });

};

module.exports = accountUpdated;