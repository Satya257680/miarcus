const baseTemplate = require("./baseTemplate");
const { getAppUrl } = require("../../config/appUrl");

const accountActivated = (user) => {

    return baseTemplate({

        // ===========================
        // Page Title
        // ===========================

        title: "Account Activated Successfully",

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
            Congratulations! Your account activation has been completed successfully.

            <br><br>

            You can now sign in to the
            <strong>miarcus</strong>
            platform using your registered email address and the password you created during activation.

            <br><br>

            Once you sign in, you'll have access to the features and modules assigned to your role and permissions by your administrator.

            <br><br>

            We recommend reviewing your profile information, department, designation, reporting manager, and account settings to ensure everything is accurate.

            <br><br>

            We're excited to have you as part of the
            <strong>miarcus</strong>
            community and look forward to supporting your success.
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

        infoBoxTitle: "Activation Successful",

        infoBoxMessage: `
            ✓ Your account has been successfully activated.

            <br><br>

            ✓ You can now sign in using your registered email address and password.

            <br><br>

            ✓ Your available features and modules are determined by the permissions assigned by your administrator.

            <br><br>

            ✓ Please review your account information after signing in to ensure everything is accurate.

            <br><br>

            ✓ Keep your password secure and never share your login credentials with anyone.

            <br><br>

            ✓ If you experience any issues accessing your account, please contact your administrator for assistance.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            Thank you for choosing
            <strong>miarcus</strong>.

            <br><br>

            We're delighted to welcome you and hope you have a productive and successful experience using our platform.

            <br><br>

            If you need any assistance or have any questions, please don't hesitate to contact your administrator.

            <br><br>

            Welcome aboard, and thank you for being part of the
            <strong>miarcus</strong>
            community.
        `,

        // ===========================
        // Options
        // ===========================

        showButton: true,

        showInfoBox: true

    });

};

module.exports = accountActivated;