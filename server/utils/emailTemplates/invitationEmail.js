const baseTemplate = require("./baseTemplate");
const { getAppUrl } = require("../../config/appUrl");

const invitationEmail = (user, activationLink) => {

    return baseTemplate({

        // ===========================
        // Page Title
        // ===========================

        title: "Welcome to miarcus",

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

            Your administrator has successfully created an account for you.

            <br><br>

            To begin using the platform, you'll first need to activate your account and create a secure password.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            We're delighted to welcome you to the
            <strong>miarcus</strong> platform.

            <br><br>

            Click the button below to activate your account and create your password.

            <br><br>

            Once your account has been activated, you'll be able to securely sign in using your registered email address and your newly created password.

            <br><br>

            Please complete the activation process as soon as possible to start using all the features available to you.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "Activate Account",

        buttonLink:
            activationLink ||
            getAppUrl(),

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Account Activation Information",

        infoBoxMessage: `
            ✓ This activation link is valid for
            <strong>24 hours</strong>.

            <br><br>

            ✓ This activation link can only be used once.

            <br><br>

            ✓ Never share your activation link with anyone.

            <br><br>

            ✓ Create a strong password containing uppercase letters, lowercase letters, numbers, and special characters.

            <br><br>

            ✓ If your activation link expires, please contact your administrator to request a new invitation.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            If you were not expecting this invitation, you can safely ignore this email.

            <br><br>

            If you have any questions or require assistance during the activation process, please contact your administrator.

            <br><br>

            We look forward to welcoming you to
            <strong>miarcus</strong>.
        `,

        showButton: true,

        showInfoBox: true

    });

};

module.exports = invitationEmail;