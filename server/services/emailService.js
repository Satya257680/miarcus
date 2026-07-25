const transporter = require("../config/mailer");

// ======================================
// Send Invitation Email
// ======================================

const sendInvitationEmail = async (user, activationLink) => {

    return transporter.sendMail({

        from: process.env.EMAIL_USER,

        to: user.email,

        subject: "Welcome to miarcus",

        html: `
            <div style="font-family:Arial,sans-serif;padding:30px;line-height:1.8;color:#333;max-width:700px;margin:auto;">

                <h2 style="color:#6C63FF;">
                    Welcome to miarcus
                </h2>

                <p>Hello <b>${user.fullName}</b>,</p>

                <p>
                    Your account has been created successfully.
                </p>

                <p>
                    Click the button below to activate your account and create your password.
                </p>

                <p style="margin:30px 0;">

                    <a
                        href="${activationLink}"
                        style="
                            background:#6C63FF;
                            color:#ffffff;
                            padding:14px 28px;
                            text-decoration:none;
                            border-radius:6px;
                            font-size:16px;
                            font-weight:bold;
                            display:inline-block;
                        "
                    >
                        Activate Account
                    </a>

                </p>

                <p>
                    This activation link will expire in 24 hours.
                </p>

                <hr style="margin:30px 0;">

                <p>
                    Thank you for choosing <b>miarcus</b>.
                </p>

                <p>
                    Regards,<br>
                    <b>miarcus Team</b>
                </p>

            </div>
        `

    });

};

module.exports = {

    sendInvitationEmail

};