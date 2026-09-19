const baseTemplate = require("./baseTemplate");
const { getAppUrl } = require("../../config/appUrl");

// ==========================================================
// ACCOUNT CREDENTIALS EMAIL
// ==========================================================
//
// Used two ways:
//
// 1. When an administrator creates a new user — the account
//    is active immediately and the admin-chosen password is
//    delivered straight to the user (no self-service
//    "activate & choose your own password" step anymore).
//
// 2. When an administrator resets/updates an existing user's
//    password from the Password Management screen.
// ==========================================================

const accountCredentialsEmail = (user, password, { isNewAccount = true } = {}) => {

    const loginLink = `${getAppUrl()}/login`;

    return baseTemplate({

        title: isNewAccount
            ? "Welcome to Mi Arcus"
            : "Your Mi Arcus Password Has Been Updated",

        greeting: `
            Hello
            <span style="color:#5F39FF;font-weight:bold;">
                ${user.fullName || user.name}
            </span>,
        `,

        intro: isNewAccount
            ? `
                Welcome to
                <strong style="color:#5F39FF;">Mi Arcus</strong>!

                <br><br>

                Your administrator has created an account for you and set
                your sign-in password. Your account is already active —
                there is nothing further you need to do to activate it.
            `
            : `
                Your administrator has updated the password for your
                <strong style="color:#5F39FF;">Mi Arcus</strong> account.

                <br><br>

                Please use the new credentials below the next time you sign in.
            `,

        message: `
            <table
                width="100%"
                border="0"
                cellpadding="0"
                cellspacing="0"
                style="
                    margin-top:10px;
                    background:#F8F6FF;
                    border:1px solid #E6DFFF;
                    border-radius:12px;
                "
            >
                <tr>
                    <td style="padding:20px 25px;">
                        <p style="margin:0 0 10px;font-size:15px;color:#777;">
                            Email Address
                        </p>
                        <p style="margin:0 0 18px;font-size:18px;font-weight:bold;color:#202040;">
                            ${user.email}
                        </p>
                        <p style="margin:0 0 10px;font-size:15px;color:#777;">
                            Password
                        </p>
                        <p style="margin:0;font-size:18px;font-weight:bold;color:#202040;letter-spacing:1px;">
                            ${password}
                        </p>
                    </td>
                </tr>
            </table>
        `,

        buttonText: "Login Now",

        buttonLink: loginLink,

        infoBoxTitle: "Keep Your Account Secure",

        infoBoxMessage: `
            ✓ Never share this password with anyone.

            <br><br>

            ✓ You can change your password any time from your Profile
            once you are signed in.

            <br><br>

            ✓ Self-service "Forgot Password" is not available on this
            account — if you ever get locked out, please contact your
            administrator to have your password reset.
        `,

        bottomMessage: `
            If you were not expecting this email, please contact your
            administrator immediately.
        `,

        showButton: true,

        showInfoBox: true

    });

};

module.exports = accountCredentialsEmail;
