// ======================================================
// MIARCUS MAILER
// Resend Email API
// ======================================================

require("dotenv").config();

const { Resend } = require("resend");

// ======================================================
// ENVIRONMENT
// ======================================================

const RESEND_API_KEY =
    String(
        process.env.RESEND_API_KEY || ""
    ).trim();

const EMAIL_FROM =
    String(
        process.env.EMAIL_FROM || ""
    ).trim();

const FRONTEND_URL =
    String(
        process.env.FRONTEND_URL ||
        "http://localhost:5173"
    )
        .trim()
        .replace(/\/$/, "");

// ======================================================
// VALIDATION
// ======================================================

if (!RESEND_API_KEY) {

    console.warn(
        "⚠️ RESEND_API_KEY is not configured."
    );

}

if (!EMAIL_FROM) {

    console.warn(
        "⚠️ EMAIL_FROM is not configured."
    );

}

// ======================================================
// RESEND CLIENT
// ======================================================

const resend =
    RESEND_API_KEY
        ? new Resend(RESEND_API_KEY)
        : null;

// ======================================================
// VERIFY MAILER
// ======================================================

async function verifyMailer() {

    if (!RESEND_API_KEY) {

        console.warn(
            "⚠️ Resend verification skipped."
        );

        return false;
    }

    if (!EMAIL_FROM) {

        console.warn(
            "⚠️ Resend verification skipped because EMAIL_FROM is missing."
        );

        return false;
    }

    if (!resend) {

        console.warn(
            "⚠️ Resend client is not initialized."
        );

        return false;
    }

    try {

        /*
         * Resend does not require an SMTP-style
         * transporter.verify().
         *
         * The actual API request is performed when
         * an email is sent.
         *
         * Therefore this function only validates
         * the required configuration.
         */

        console.log(
            "✅ Resend Mailer Ready"
        );

        console.log(
            "📧 From:",
            EMAIL_FROM
        );

        return true;

    } catch (error) {

        console.error(
            "❌ Resend Mailer Error"
        );

        console.error(
            "Code:",
            error.code || "N/A"
        );

        console.error(
            "Message:",
            error.message || error
        );

        return false;
    }
}

// ======================================================
// SEND MAIL
// ======================================================

async function sendMail(options = {}) {

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (!resend) {

        const error =
            new Error(
                "Resend is not configured. Missing RESEND_API_KEY."
            );

        console.error(
            "❌ Email Send Failed"
        );

        console.error(
            error.message
        );

        throw error;
    }

    if (!EMAIL_FROM) {

        const error =
            new Error(
                "EMAIL_FROM is not configured."
            );

        console.error(
            "❌ Email Send Failed"
        );

        console.error(
            error.message
        );

        throw error;
    }

    if (!options.to) {

        throw new Error(
            "Recipient email is required."
        );

    }

    if (!options.subject) {

        throw new Error(
            "Email subject is required."
        );

    }

    if (!options.html && !options.text) {

        throw new Error(
            "Email content is required."
        );

    }

    // --------------------------------------------------
    // PREPARE EMAIL
    // --------------------------------------------------

    const emailData = {

        from:
            options.from ||
            `"miarcus" <${EMAIL_FROM}>`,

        to:
            options.to,

        subject:
            options.subject,

        ...(options.html
            ? {
                html:
                    options.html
            }
            : {}),

        ...(options.text
            ? {
                text:
                    options.text
            }
            : {}),

    };

    // --------------------------------------------------
    // SEND USING RESEND
    // --------------------------------------------------

    try {

        console.log(
            "📧 Sending email..."
        );

        console.log(
            "To:",
            options.to
        );

        console.log(
            "Subject:",
            options.subject
        );

        const {
            data,
            error
        } =
            await resend.emails.send(
                emailData
            );

        // ------------------------------------------------
        // RESEND ERROR
        // ------------------------------------------------

        if (error) {

            console.error(
                "❌ Email Send Failed"
            );

            console.error(
                "Resend Error:"
            );

            console.error(
                error
            );

            const resendError =
                new Error(
                    error.message ||
                    "Resend failed to send the email."
                );

            resendError.code =
                error.name ||
                "RESEND_ERROR";

            resendError.resendError =
                error;

            throw resendError;
        }

        // ------------------------------------------------
        // SUCCESS
        // ------------------------------------------------

        console.log(
            "✅ Email Sent Successfully"
        );

        console.log(
            "Message ID:",
            data?.id ||
            "N/A"
        );

        return {

            ...data,

            messageId:
                data?.id ||
                null,

        };

    } catch (error) {

        console.error(
            "❌ Email Send Failed"
        );

        console.error(
            "Code:",
            error.code ||
            "N/A"
        );

        console.error(
            "Message:",
            error.message ||
            error
        );

        throw error;
    }
}

// ======================================================
// PASSWORD RESET OTP
// ======================================================

async function sendPasswordResetOTP(
    email,
    otp
) {

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

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

    // --------------------------------------------------
    // EMAIL HTML
    // --------------------------------------------------

    const html = `

<!DOCTYPE html>

<html>

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Miarcus Password Reset
    </title>

</head>

<body
    style="
        margin:0;
        padding:0;
        background:#edf3f5;
        font-family:Arial,Helvetica,sans-serif;
    "
>

    <div
        style="
            max-width:600px;
            margin:40px auto;
            background:#ffffff;
            border-radius:14px;
            overflow:hidden;
            box-shadow:0 8px 30px rgba(0,0,0,0.08);
        "
    >

        <!-- HEADER -->

        <div
            style="
                background:#3f6b78;
                padding:28px 20px;
                text-align:center;
            "
        >

            <h1
                style="
                    margin:0;
                    color:#ffffff;
                    font-size:28px;
                    font-weight:700;
                "
            >
                miarcus
            </h1>

            <p
                style="
                    margin:8px 0 0;
                    color:#e8f1f3;
                    font-size:14px;
                "
            >
                ERP Management System
            </p>

        </div>


        <!-- CONTENT -->

        <div
            style="
                padding:35px 30px;
            "
        >

            <h2
                style="
                    margin:0 0 15px;
                    color:#3f6b78;
                    font-size:24px;
                "
            >
                Password Reset
            </h2>

            <p
                style="
                    color:#555555;
                    font-size:15px;
                    line-height:1.7;
                    margin-bottom:25px;
                "
            >
                We received a request to reset the password
                for your miarcus account.
            </p>

            <p
                style="
                    color:#555555;
                    font-size:15px;
                    line-height:1.7;
                "
            >
                Your verification OTP is:
            </p>


            <!-- OTP -->

            <div
                style="
                    text-align:center;
                    margin:30px 0;
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


            <p
                style="
                    color:#777777;
                    font-size:14px;
                    line-height:1.6;
                "
            >
                Please enter this OTP on the miarcus
                password reset page to continue.
            </p>

            <p
                style="
                    color:#777777;
                    font-size:14px;
                    line-height:1.6;
                "
            >
                If you did not request a password reset,
                you can safely ignore this email.
            </p>

        </div>


        <!-- FOOTER -->

        <div
            style="
                border-top:1px solid #eeeeee;
                padding:20px;
                text-align:center;
            "
        >

            <p
                style="
                    margin:0;
                    color:#999999;
                    font-size:12px;
                "
            >
                © 2026 Miarcus.
                All rights reserved.
            </p>

        </div>

    </div>

</body>

</html>

`;

    // --------------------------------------------------
    // SEND
    // --------------------------------------------------

    return sendMail({

        to:
            email,

        subject:
            "Miarcus ERP Password Reset OTP",

        html:
            html,

        text:
            `Your Miarcus password reset OTP is ${otp}. Please enter this OTP on the password reset page.`,

    });
}

// ======================================================
// ACCOUNT ACTIVATED
// ======================================================

async function sendAccountActivatedEmail(
    user
) {

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

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

    // --------------------------------------------------
    // EMAIL HTML
    // --------------------------------------------------

    const html = `

<!DOCTYPE html>

<html>

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Account Activated
    </title>

</head>

<body
    style="
        margin:0;
        padding:0;
        background:#edf3f5;
        font-family:Arial,Helvetica,sans-serif;
    "
>

    <div
        style="
            max-width:600px;
            margin:40px auto;
            background:#ffffff;
            border-radius:14px;
            overflow:hidden;
        "
    >

        <div
            style="
                background:#3f6b78;
                padding:28px;
                text-align:center;
            "
        >

            <h1
                style="
                    margin:0;
                    color:#ffffff;
                    font-size:28px;
                "
            >
                miarcus
            </h1>

        </div>


        <div
            style="
                padding:35px 30px;
            "
        >

            <h2
                style="
                    color:#3f6b78;
                    margin-top:0;
                "
            >
                Account Activated
            </h2>

            <p
                style="
                    color:#555555;
                    font-size:15px;
                    line-height:1.7;
                "
            >
                Hello ${name},
            </p>

            <p
                style="
                    color:#555555;
                    font-size:15px;
                    line-height:1.7;
                "
            >
                Your miarcus account has been successfully
                activated.
            </p>

            <div
                style="
                    text-align:center;
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

            </div>

        </div>


        <div
            style="
                border-top:1px solid #eeeeee;
                padding:20px;
                text-align:center;
            "
        >

            <p
                style="
                    margin:0;
                    color:#999999;
                    font-size:12px;
                "
            >
                © 2026 Miarcus.
                All rights reserved.
            </p>

        </div>

    </div>

</body>

</html>

`;

    // --------------------------------------------------
    // SEND
    // --------------------------------------------------

    return sendMail({

        to:
            user.email,

        subject:
            "miarcus - Account Activated",

        html:
            html,

        text:
            `Hello ${name}, your miarcus account has been successfully activated. Login here: ${FRONTEND_URL}/`,

    });
}

// ======================================================
// ACCOUNT DEACTIVATED
// ======================================================

async function sendAccountDeactivatedEmail(
    user
) {

    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

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

    // --------------------------------------------------
    // EMAIL HTML
    // --------------------------------------------------

    const html = `

<!DOCTYPE html>

<html>

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        Account Deactivated
    </title>

</head>

<body
    style="
        margin:0;
        padding:0;
        background:#edf3f5;
        font-family:Arial,Helvetica,sans-serif;
    "
>

    <div
        style="
            max-width:600px;
            margin:40px auto;
            background:#ffffff;
            border-radius:14px;
            overflow:hidden;
        "
    >

        <div
            style="
                background:#3f6b78;
                padding:28px;
                text-align:center;
            "
        >

            <h1
                style="
                    margin:0;
                    color:#ffffff;
                    font-size:28px;
                "
            >
                miarcus
            </h1>

        </div>


        <div
            style="
                padding:35px 30px;
            "
        >

            <h2
                style="
                    color:#3f6b78;
                    margin-top:0;
                "
            >
                Account Deactivated
            </h2>

            <p
                style="
                    color:#555555;
                    font-size:15px;
                    line-height:1.7;
                "
            >
                Hello ${name},
            </p>

            <p
                style="
                    color:#555555;
                    font-size:15px;
                    line-height:1.7;
                "
            >
                Your miarcus account has been deactivated.
            </p>

            <p
                style="
                    color:#777777;
                    font-size:14px;
                    line-height:1.7;
                "
            >
                If you believe this was done in error,
                please contact your system administrator.
            </p>

        </div>


        <div
            style="
                border-top:1px solid #eeeeee;
                padding:20px;
                text-align:center;
            "
        >

            <p
                style="
                    margin:0;
                    color:#999999;
                    font-size:12px;
                "
            >
                © 2026 Miarcus.
                All rights reserved.
            </p>

        </div>

    </div>

</body>

</html>

`;

    // --------------------------------------------------
    // SEND
    // --------------------------------------------------

    return sendMail({

        to:
            user.email,

        subject:
            "miarcus - Account Deactivated",

        html:
            html,

        text:
            `Hello ${name}, your miarcus account has been deactivated. If you believe this was done in error, please contact your system administrator.`,

    });
}

// ======================================================
// EXPORT
// ======================================================

module.exports = {

    resend,

    verifyMailer,

    sendMail,

    sendPasswordResetOTP,

    sendAccountActivatedEmail,

    sendAccountDeactivatedEmail,

};