// ==========================================================
// MIARCUS MAILER
// Gmail API / OAuth2
// ==========================================================

const { google } = require("googleapis");

// ==========================================================
// ENVIRONMENT VARIABLES
// ==========================================================

const GMAIL_CLIENT_ID = String(
    process.env.GMAIL_CLIENT_ID || ""
).trim();

const GMAIL_CLIENT_SECRET = String(
    process.env.GMAIL_CLIENT_SECRET || ""
).trim();

const GMAIL_REFRESH_TOKEN = String(
    process.env.GMAIL_REFRESH_TOKEN || ""
).trim();

const EMAIL_FROM = String(
    process.env.EMAIL_FROM || ""
).trim();

// ==========================================================
// VALIDATION
// ==========================================================

if (!GMAIL_CLIENT_ID) {
    console.error(
        "❌ GMAIL_CLIENT_ID is not configured."
    );
}

if (!GMAIL_CLIENT_SECRET) {
    console.error(
        "❌ GMAIL_CLIENT_SECRET is not configured."
    );
}

if (!GMAIL_REFRESH_TOKEN) {
    console.error(
        "❌ GMAIL_REFRESH_TOKEN is not configured."
    );
}

if (!EMAIL_FROM) {
    console.error(
        "❌ EMAIL_FROM is not configured."
    );
}

// ==========================================================
// GOOGLE OAUTH2 CLIENT
// ==========================================================

const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET
);

// ==========================================================
// SET REFRESH TOKEN
// ==========================================================

if (GMAIL_REFRESH_TOKEN) {

    oauth2Client.setCredentials({
        refresh_token: GMAIL_REFRESH_TOKEN
    });

}

// ==========================================================
// GMAIL API
// ==========================================================

const gmail = google.gmail({
    version: "v1",
    auth: oauth2Client
});

// ==========================================================
// BASE64URL ENCODER
// Gmail API requires URL-safe Base64
// ==========================================================

function encodeBase64Url(value) {

    return Buffer
        .from(value, "utf8")
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

}

// ==========================================================
// MIME HEADER ENCODER
// Handles special characters in subject/from
// ==========================================================

function encodeHeader(value) {

    if (!value) {
        return "";
    }

    // ASCII-safe headers can be returned directly
    if (/^[\x00-\x7F]*$/.test(value)) {
        return value;
    }

    return "=?UTF-8?B?" +
        Buffer
            .from(value, "utf8")
            .toString("base64") +
        "?=";

}

// ==========================================================
// CREATE MIME MESSAGE
// ==========================================================

function createMimeMessage({

    from,

    to,

    subject,

    html,

    text

}) {

    const lines = [];

    lines.push(
        `From: ${from}`
    );

    lines.push(
        `To: ${to}`
    );

    lines.push(
        `Subject: ${encodeHeader(subject)}`
    );

    lines.push(
        "MIME-Version: 1.0"
    );

    // ------------------------------------------------------
    // HTML + TEXT
    // ------------------------------------------------------

    if (html && text) {

        const boundary =
            "----=_MiarcusBoundary_" +
            Date.now();

        lines.push(
            `Content-Type: multipart/alternative; boundary="${boundary}"`
        );

        lines.push("");

        // TEXT PART

        lines.push(
            `--${boundary}`
        );

        lines.push(
            "Content-Type: text/plain; charset=UTF-8"
        );

        lines.push(
            "Content-Transfer-Encoding: 8bit"
        );

        lines.push("");

        lines.push(text);

        lines.push("");

        // HTML PART

        lines.push(
            `--${boundary}`
        );

        lines.push(
            "Content-Type: text/html; charset=UTF-8"
        );

        lines.push(
            "Content-Transfer-Encoding: 8bit"
        );

        lines.push("");

        lines.push(html);

        lines.push("");

        lines.push(
            `--${boundary}--`
        );

    }

    // ------------------------------------------------------
    // HTML ONLY
    // ------------------------------------------------------

    else if (html) {

        lines.push(
            "Content-Type: text/html; charset=UTF-8"
        );

        lines.push(
            "Content-Transfer-Encoding: 8bit"
        );

        lines.push("");

        lines.push(html);

    }

    // ------------------------------------------------------
    // TEXT ONLY
    // ------------------------------------------------------

    else {

        lines.push(
            "Content-Type: text/plain; charset=UTF-8"
        );

        lines.push(
            "Content-Transfer-Encoding: 8bit"
        );

        lines.push("");

        lines.push(text);

    }

    return lines.join("\r\n");

}

// ==========================================================
// VERIFY GMAIL API CONNECTION
// ==========================================================

const verifyMailer = async () => {

    if (
        !GMAIL_CLIENT_ID ||
        !GMAIL_CLIENT_SECRET ||
        !GMAIL_REFRESH_TOKEN ||
        !EMAIL_FROM
    ) {

        console.error(
            "❌ Gmail API cannot be verified."
        );

        console.error(
            "Required environment variables are missing."
        );

        return false;

    }

    try {

        console.log(
            "=========================================="
        );

        console.log(
            "📧 VERIFYING GMAIL API CONNECTION"
        );

        console.log(
            "Authentication: OAuth2"
        );

        console.log(
            "Gmail API: Enabled"
        );

        console.log(
            "From:",
            EMAIL_FROM
        );

        console.log(
            "=========================================="
        );

        // --------------------------------------------------
        // Ask Google for a fresh access token.
        // This automatically uses the refresh token.
        // --------------------------------------------------

        const accessTokenResponse =
            await oauth2Client.getAccessToken();

        if (!accessTokenResponse?.token) {

            throw new Error(
                "Google did not return an access token."
            );

        }

        console.log(
            "=========================================="
        );

        console.log(
            "✅ GMAIL OAUTH2 CONNECTION SUCCESSFUL"
        );

        console.log(
            "=========================================="
        );

        return true;

    }
    catch (error) {

        console.error(
            "=========================================="
        );

        console.error(
            "❌ GMAIL OAUTH2 CONNECTION FAILED"
        );

        console.error(
            "Code:",
            error?.code || "N/A"
        );

        console.error(
            "Message:",
            error?.message || error
        );

        console.error(
            "=========================================="
        );

        return false;

    }

};

// ==========================================================
// SEND MAIL
// ==========================================================

const sendMail = async (mailOptions = {}) => {

    // ------------------------------------------------------
    // CONFIGURATION CHECK
    // ------------------------------------------------------

    if (!GMAIL_CLIENT_ID) {

        throw new Error(
            "GMAIL_CLIENT_ID is missing."
        );

    }

    if (!GMAIL_CLIENT_SECRET) {

        throw new Error(
            "GMAIL_CLIENT_SECRET is missing."
        );

    }

    if (!GMAIL_REFRESH_TOKEN) {

        throw new Error(
            "GMAIL_REFRESH_TOKEN is missing."
        );

    }

    if (!EMAIL_FROM) {

        throw new Error(
            "EMAIL_FROM is missing."
        );

    }

    // ------------------------------------------------------
    // MAIL VALIDATION
    // ------------------------------------------------------

    if (!mailOptions.to) {

        throw new Error(
            "Email recipient is missing."
        );

    }

    if (!mailOptions.subject) {

        throw new Error(
            "Email subject is missing."
        );

    }

    if (!mailOptions.html && !mailOptions.text) {

        throw new Error(
            "Email content is missing."
        );

    }

    // ------------------------------------------------------
    // SENDER
    // ------------------------------------------------------

    const from =
        mailOptions.from ||
        EMAIL_FROM;

    // ------------------------------------------------------
    // MIME MESSAGE
    // ------------------------------------------------------

    const rawMessage = createMimeMessage({

        from,

        to: mailOptions.to,

        subject: mailOptions.subject,

        html: mailOptions.html,

        text: mailOptions.text

    });

    // ------------------------------------------------------
    // ENCODE MESSAGE
    // ------------------------------------------------------

    const encodedMessage =
        encodeBase64Url(rawMessage);

    try {

        console.log(
            "=========================================="
        );

        console.log(
            "📧 SENDING EMAIL USING GMAIL API"
        );

        console.log(
            "From:",
            from
        );

        console.log(
            "To:",
            mailOptions.to
        );

        console.log(
            "Subject:",
            mailOptions.subject
        );

        console.log(
            "=========================================="
        );

        // --------------------------------------------------
        // SEND THROUGH GMAIL API
        // --------------------------------------------------

        const result =
            await gmail.users.messages.send({

                userId: "me",

                requestBody: {

                    raw: encodedMessage

                }

            });

        console.log(
            "=========================================="
        );

        console.log(
            "✅ EMAIL SENT SUCCESSFULLY"
        );

        console.log(
            "Gmail Message ID:",
            result?.data?.id || "N/A"
        );

        console.log(
            "Thread ID:",
            result?.data?.threadId || "N/A"
        );

        console.log(
            "=========================================="
        );

        return result?.data;

    }
    catch (error) {

        console.error(
            "=========================================="
        );

        console.error(
            "❌ GMAIL API EMAIL SEND FAILED"
        );

        console.error(
            "From:",
            from
        );

        console.error(
            "To:",
            mailOptions.to
        );

        console.error(
            "Subject:",
            mailOptions.subject
        );

        console.error(
            "Code:",
            error?.code || "N/A"
        );

        console.error(
            "Status:",
            error?.response?.status || "N/A"
        );

        console.error(
            "Message:",
            error?.message || error
        );

        if (error?.response?.data) {

            console.error(
                "Google API Error:",
                JSON.stringify(
                    error.response.data,
                    null,
                    2
                )
            );

        }

        console.error(
            "=========================================="
        );

        throw error;

    }

};

// ==========================================================
// EXPORT
// ==========================================================

module.exports = {

    sendMail,

    verifyMailer,

    gmail,

    oauth2Client

};