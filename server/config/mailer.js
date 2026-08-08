// ======================================================
// MIARCUS MAILER
// Gmail SMTP
// ======================================================

require("dotenv").config();

const nodemailer =
    require("nodemailer");

// ======================================================
// ENVIRONMENT
// ======================================================

const EMAIL_USER =
    String(
        process.env.EMAIL_USER || ""
    ).trim();

const EMAIL_PASS =
    String(
        process.env.EMAIL_PASS || ""
    ).trim();

const FRONTEND_URL =
    String(
        process.env.FRONTEND_URL ||
        "http://localhost:5173"
    ).replace(
        /\/$/,
        ""
    );

// ======================================================
// VALIDATION
// ======================================================

if (!EMAIL_USER) {

    console.warn(
        "⚠️ EMAIL_USER is not configured."
    );
}

if (!EMAIL_PASS) {

    console.warn(
        "⚠️ EMAIL_PASS is not configured."
    );
}

// ======================================================
// TRANSPORTER
// ======================================================

const transporter =
    nodemailer.createTransport({

        service: "gmail",

        auth: {

            user:
                EMAIL_USER,

            pass:
                EMAIL_PASS,
        },

        connectionTimeout:
            15000,

        greetingTimeout:
            15000,

        socketTimeout:
            20000,
    });

// ======================================================
// VERIFY SMTP
// ======================================================

async function verifyMailer() {

    if (
        !EMAIL_USER ||
        !EMAIL_PASS
    ) {

        console.warn(
            "⚠️ Mail server verification skipped."
        );

        return false;
    }

    try {

        await transporter.verify();

        console.log(
            "✅ Mail Server Ready"
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Mail Server Error"
        );

        console.error(
            "Code:",
            error.code || "N/A"
        );

        console.error(
            "Response:",
            error.response || "N/A"
        );

        console.error(
            "Message:",
            error.message
        );

        console.error("");

        console.error(
            "⚠️ Gmail SMTP authentication failed."
        );

        console.error(
            "⚠️ Use a Gmail App Password, not your normal Gmail password."
        );

        return false;
    }
}

// ======================================================
// SEND MAIL
// ======================================================

function sendMail(
    options
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            transporter.sendMail(
                {

                    from:
                        `"miarcus" <${EMAIL_USER}>`,

                    ...options,

                },
                (
                    error,
                    info
                ) => {

                    if (error) {

                        console.error(
                            "❌ Email Send Failed"
                        );

                        console.error(
                            "Code:",
                            error.code || "N/A"
                        );

                        console.error(
                            "Response:",
                            error.response ||
                            "N/A"
                        );

                        console.error(
                            "Message:",
                            error.message
                        );

                        reject(error);

                        return;
                    }

                    console.log(
                        "✅ Email Sent:",
                        info.messageId
                    );

                    resolve(info);
                }
            );
        }
    );
}

// ======================================================
// PASSWORD RESET OTP
// ======================================================

async function sendPasswordResetOTP(
    email,
    otp
) {

    if (!email) {

        throw new Error(
            "Recipient email is required."
        );
    }

    if (!otp) {

        throw new Error(
            "OTP is required."
        );
    }

    return sendMail({

        to:
            email,

        subject:
            "Miarcus ERP Password Reset OTP",

        html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Password Reset OTP</title>
</head>

<body
style="
margin:0;
padding:0;
background:#f4f7f9;
font-family:Arial,Helvetica,sans-serif;
"
>

<div
style="
max-width:600px;
margin:40px auto;
background:#ffffff;
border-radius:12px;
padding:40px;
box-shadow:0 4px 20px rgba(0,0,0,0.08);
"
>

<h2
style="
margin-top:0;
color:#3f6b78;
"
>
miarcus
</h2>

<p>
Hello,
</p>

<p>
We received a request to reset your
miarcus ERP password.
</p>

<p>
Your OTP is:
</p>

<div
style="
margin:25px 0;
text-align:center;
"
>

<span
style="
display:inline-block;
font-size:32px;
font-weight:bold;
letter-spacing:8px;
background:#edf3f5;
padding:18px 28px;
border-radius:10px;
color:#3f6b78;
"
>
${otp}
</span>

</div>

<p>
This OTP is valid for
<b>10 minutes</b>.
</p>

<p>
Do not share this OTP with anyone.
</p>

<hr
style="
border:none;
border-top:1px solid #e5e7eb;
margin:30px 0;
"
/>

<p
style="
font-size:13px;
color:#6b7280;
"
>
If you did not request this password reset,
you can safely ignore this email.
</p>

<p>
Regards,<br>
<b>miarcus Team</b>
</p>

</div>

</body>
</html>
        `,
    });
}

// ======================================================
// ACCOUNT ACTIVATED
// ======================================================

async function sendAccountActivatedEmail(
    user
) {

    if (
        !user ||
        !user.email
    ) {

        throw new Error(
            "User email is required."
        );
    }

    const name =
        user.fullName ||
        user.name ||
        "User";

    return sendMail({

        to:
            user.email,

        subject:
            "miarcus - Account Activated",

        html: `
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8">
<title>Account Activated</title>
</head>

<body
style="
margin:0;
padding:0;
background:#f4f7f9;
font-family:Arial,Helvetica,sans-serif;
"
>

<div
style="
max-width:600px;
margin:40px auto;
background:#ffffff;
padding:40px;
border-radius:12px;
"
>

<h2
style="
color:#3f6b78;
"
>
miarcus
</h2>

<p>
Dear <b>${name}</b>,
</p>

<p>
We are pleased to inform you that your
<b>miarcus account has been activated.</b>
</p>

<p>
Your account is now active and ready to use.
</p>

<p
style="
margin:30px 0;
"
>

<a
href="${FRONTEND_URL}/"
style="
display:inline-block;
background:#3f6b78;
color:#ffffff;
padding:14px 28px;
text-decoration:none;
border-radius:7px;
font-weight:bold;
"
>
Login to miarcus
</a>

</p>

<p>
If the button does not work, open:
</p>

<p>
<a
href="${FRONTEND_URL}/"
>
${FRONTEND_URL}/
</a>
</p>

<hr
style="
border:none;
border-top:1px solid #e5e7eb;
margin:30px 0;
"
/>

<p>
Regards,<br>
<b>miarcus Team</b>
</p>

</div>

</body>
</html>
        `,
    });
}

// ======================================================
// ACCOUNT DEACTIVATED
// ======================================================

async function sendAccountDeactivatedEmail(
    user
) {

    if (
        !user ||
        !user.email
    ) {

        throw new Error(
            "User email is required."
        );
    }

    const name =
        user.fullName ||
        user.name ||
        "User";

    return sendMail({

        to:
            user.email,

        subject:
            "miarcus - Account Deactivated",

        html: `
<!DOCTYPE html>
<html>

<head>
<meta charset="UTF-8">
<title>Account Deactivated</title>
</head>

<body
style="
margin:0;
padding:0;
background:#f4f7f9;
font-family:Arial,Helvetica,sans-serif;
"
>

<div
style="
max-width:600px;
margin:40px auto;
background:#ffffff;
padding:40px;
border-radius:12px;
"
>

<h2
style="
color:#3f6b78;
"
>
miarcus
</h2>

<p>
Dear <b>${name}</b>,
</p>

<p>
Your
<b>miarcus account has been deactivated.</b>
</p>

<p>
You can no longer access your account.
</p>

<p>
If you believe this action was taken in error,
please contact your administrator.
</p>

<hr
style="
border:none;
border-top:1px solid #e5e7eb;
margin:30px 0;
"
/>

<p>
Regards,<br>
<b>miarcus Team</b>
</p>

</div>

</body>
</html>
        `,
    });
}

// ======================================================
// EXPORT
// ======================================================

module.exports = {

    transporter,

    verifyMailer,

    sendMail,

    sendPasswordResetOTP,

    sendAccountActivatedEmail,

    sendAccountDeactivatedEmail,
};