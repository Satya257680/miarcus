const baseTemplate = require("./baseTemplate");

const forgotPasswordOTP = (user, otp) => {

    return baseTemplate({

        // ===========================
        // Page Title
        // ===========================

        title: "Password Reset Verification",

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
            We received a request to reset the password for your
            <strong style="color:#5F39FF;">
                Mi Arcus
            </strong>
            account.

            <br><br>

            To protect your account, we need to verify your identity before allowing you to reset your password.
        `,

        // ===========================
        // Main Message
        // ===========================

        message: `
            Please use the One-Time Password (OTP) below to continue resetting your password.

            <br><br>

            <div style="
                background:#F8F6FF;
                border:2px dashed #6C63FF;
                border-radius:12px;
                padding:25px;
                text-align:center;
                margin:30px 0;
            ">

                <div style="
                    font-size:15px;
                    color:#666;
                    margin-bottom:12px;
                    font-weight:600;
                ">
                    Your Verification Code
                </div>

                <div style="
                    font-size:38px;
                    font-weight:bold;
                    letter-spacing:10px;
                    color:#6C63FF;
                ">
                    ${otp}
                </div>

            </div>

            This verification code is valid for
            <strong>10 minutes</strong>.

            <br><br>

            Enter this OTP on the password reset page to continue.

            <br><br>

            For your security, this OTP can only be used once.
        `,

        // ===========================
        // Button
        // ===========================

        buttonText: "",

        buttonLink: "",

        // ===========================
        // Information Box
        // ===========================

        infoBoxTitle: "Security Notice",

        infoBoxMessage: `
            ✓ Never share this OTP with anyone.

            <br><br>

            ✓ Mi Arcus will never ask for your OTP by email, phone call, text message, or social media.

            <br><br>

            ✓ This OTP is valid for
            <strong>10 minutes</strong>
            and can only be used once.

            <br><br>

            ✓ If your OTP expires, simply request another password reset.

            <br><br>

            ✓ If you did not request this password reset, ignore this email and contact your administrator immediately if you suspect unauthorized access.
        `,

        // ===========================
        // Bottom Message
        // ===========================

        bottomMessage: `
            If you did not request a password reset, you can safely ignore this email.

            <br><br>

            If you believe someone is attempting to access your account without your permission, please contact your administrator immediately.

            <br><br>

            Protecting your account and personal information is our highest priority.

            <br><br>

            Thank you for choosing
            <strong>Mi Arcus</strong>.
        `,

        // ===========================
        // Options
        // ===========================

        showButton: false,

        showInfoBox: true

    });

};

module.exports = forgotPasswordOTP;