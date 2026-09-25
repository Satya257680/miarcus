// ==========================================================
// MI ARCUS MAILER
// Gmail API OAuth2 ONLY
// ==========================================================
//
// Required .env:
//
// GMAIL_CLIENT_ID=...
// GMAIL_CLIENT_SECRET=...
// GMAIL_REFRESH_TOKEN=...
// GMAIL_USER=miarcus.notifications@gmail.com
// MAIL_TRANSPORT=gmail_api
//
// This mailer:
// - Uses Gmail API over HTTPS
// - Uses ONLY gmail.send OAuth authorization
// - Does NOT use Gmail SMTP
// - Does NOT use Resend
// - Does NOT read Gmail inbox
// - Does NOT search Gmail
// - Does NOT modify/delete Gmail messages
// ==========================================================

const nodemailer = require("nodemailer");
const { google } = require("googleapis");

// ==========================================================
// ENVIRONMENT HELPER
// ==========================================================

const env = (name, fallback = "") =>
  String(process.env[name] ?? fallback).trim();

// ==========================================================
// GMAIL CONFIGURATION
// ==========================================================

const GMAIL_CLIENT_ID = env("GMAIL_CLIENT_ID");

const GMAIL_CLIENT_SECRET = env("GMAIL_CLIENT_SECRET");

const GMAIL_REFRESH_TOKEN = env("GMAIL_REFRESH_TOKEN");

const GMAIL_USER =
  env("GMAIL_USER") || "miarcus.notifications@gmail.com";

const MAIL_TRANSPORT =
  env("MAIL_TRANSPORT", "gmail_api").toLowerCase();

const GMAIL_CONFIGURED =
  Boolean(GMAIL_CLIENT_ID) &&
  Boolean(GMAIL_CLIENT_SECRET) &&
  Boolean(GMAIL_REFRESH_TOKEN) &&
  Boolean(GMAIL_USER);

// ==========================================================
// DEFAULT FROM
// ==========================================================

const EMAIL_FROM = GMAIL_USER;

// ==========================================================
// GOOGLE OAUTH CLIENT
// ==========================================================

let gmailClient = null;
let gmailApi = null;

if (GMAIL_CONFIGURED) {
  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: GMAIL_REFRESH_TOKEN,
  });

  gmailClient = oauth2Client;

  gmailApi = google.gmail({
    version: "v1",
    auth: oauth2Client,
  });
}

// ==========================================================
// STARTUP LOG
// ==========================================================

console.log("==========================================");
console.log("📧 MI ARCUS MAILER INITIALIZING");
console.log("==========================================");
console.log("Requested transport:", MAIL_TRANSPORT);
console.log(
  "Gmail API configured:",
  GMAIL_CONFIGURED ? "YES" : "NO"
);
console.log(
  "Gmail user:",
  GMAIL_CONFIGURED ? GMAIL_USER : "N/A"
);
console.log("Transport mode: Gmail API ONLY");
console.log("SMTP: DISABLED");
console.log("Resend: DISABLED");
console.log("==========================================");

// ==========================================================
// EMAIL VALIDATION
// ==========================================================

const EMAIL_PATTERN =
  /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

function normalizeRecipients(to) {
  if (!to) {
    const error = new Error("Email recipient is missing.");
    error.code = "EMAIL_RECIPIENT_MISSING";
    error.status = 400;
    throw error;
  }

  const recipients = Array.isArray(to)
    ? to
        .map((email) =>
          String(email || "")
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    : [
        String(to)
          .trim()
          .toLowerCase(),
      ];

  if (
    recipients.length === 0 ||
    recipients.some(
      (email) =>
        email.length > 254 ||
        !EMAIL_PATTERN.test(email)
    )
  ) {
    const error = new Error(
      "Invalid recipient email address."
    );

    error.code = "EMAIL_RECIPIENT_INVALID";
    error.status = 400;

    throw error;
  }

  return Array.isArray(to)
    ? recipients
    : recipients[0];
}

// ==========================================================
// ATTACHMENT NORMALIZATION
// ==========================================================

function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.map((attachment) => {
    const normalized = {
      filename:
        attachment.filename || "attachment",
      content: attachment.content,
    };

    if (attachment.path) {
      normalized.path = attachment.path;
    }

    if (attachment.contentType) {
      normalized.contentType =
        attachment.contentType;
    }

    if (attachment.cid) {
      normalized.cid = String(
        attachment.cid
      ).replace(/[<>\r\n]/g, "");
    }

    if (attachment.encoding) {
      normalized.encoding =
        attachment.encoding;
    }

    if (attachment.disposition) {
      normalized.contentDisposition =
        attachment.disposition;
    }

    return normalized;
  });
}

// ==========================================================
// TRANSPORT
// ==========================================================

function getTransport() {
  // Gmail API is intentionally the ONLY supported transport.
  if (
    MAIL_TRANSPORT === "gmail_api" ||
    MAIL_TRANSPORT === "gmail" ||
    MAIL_TRANSPORT === "google"
  ) {
    if (!GMAIL_CONFIGURED || !gmailApi) {
      const error = new Error(
        "Gmail API is selected but GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN or GMAIL_USER is missing."
      );

      error.code = "GMAIL_API_CONFIG_ERROR";
      error.status = 500;

      throw error;
    }

    return "gmail_api";
  }

  // Prevent accidental fallback to SMTP/Resend.
  const error = new Error(
    `Unsupported email transport "${MAIL_TRANSPORT}". MIARCUS is configured for Gmail API only. Set MAIL_TRANSPORT=gmail_api.`
  );

  error.code = "EMAIL_TRANSPORT_INVALID";
  error.status = 500;

  throw error;
}

// ==========================================================
// ERROR NORMALIZATION
// ==========================================================

function normalizeMailerError(error) {
  const normalized =
    error instanceof Error
      ? error
      : new Error(
          String(
            error?.message ||
              error ||
              "Email sending failed."
          )
        );

  const originalCode = String(
    normalized?.code || ""
  ).toUpperCase();

  const status = Number(
    normalized?.statusCode ||
      normalized?.status ||
      normalized?.response?.statusCode ||
      normalized?.response?.status ||
      normalized?.response?.data?.error?.code ||
      0
  );

  const message = String(
    normalized?.message || ""
  );

  // Gmail OAuth authentication failure
  if (
    originalCode === "401" ||
    originalCode === "UNAUTHENTICATED" ||
    status === 401 ||
    /invalid_grant|unauthorized|invalid authentication|invalid credentials|invalid client/i.test(
      message
    )
  ) {
    normalized.code =
      "GMAIL_API_AUTH_FAILED";

    normalized.status = status || 401;

    normalized.message =
      "Gmail API authentication failed. Check GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN.";

    return normalized;
  }

  // Gmail OAuth permission/scope failure
  if (
    status === 403 ||
    /permission denied|insufficient permission|insufficient authentication scopes|forbidden|scope/i.test(
      message
    )
  ) {
    normalized.code =
      "GMAIL_API_PERMISSION_FAILED";

    normalized.status = status || 403;

    normalized.message =
      "Gmail API permission failed. The OAuth token must include the Gmail send scope.";

    return normalized;
  }

  normalized.status =
    normalized.status || status || 500;

  return normalized;
}

// ==========================================================
// BUILD MIME MESSAGE
// ==========================================================
//
// Nodemailer streamTransport is used ONLY to construct
// the MIME message.
//
// It does NOT connect to Gmail SMTP.
//
// The resulting MIME is sent through Gmail API HTTPS.
// ==========================================================

async function buildRawMimeMessage(
  mailOptions,
  normalizedTo
) {
  const transport =
    nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
      newline: "unix",
    });

  const message = {
    from: GMAIL_USER,
    to: normalizedTo,
    subject: mailOptions.subject,
  };

  if (mailOptions.html) {
    message.html = mailOptions.html;
  }

  if (mailOptions.text) {
    message.text = mailOptions.text;
  }

  const attachments =
    normalizeAttachments(
      mailOptions.attachments
    );

  if (attachments.length) {
    message.attachments = attachments;
  }

  const info =
    await transport.sendMail(message);

  if (!info?.message) {
    const error = new Error(
      "Nodemailer could not build the Gmail MIME message."
    );

    error.code =
      "GMAIL_MIME_BUILD_FAILED";

    error.status = 500;

    throw error;
  }

  return Buffer.isBuffer(info.message)
    ? info.message
    : Buffer.from(
        String(info.message)
      );
}

// ==========================================================
// GMAIL API SEND
// ==========================================================

async function sendThroughGmailApi(
  mailOptions,
  normalizedTo
) {
  if (!gmailApi) {
    const error = new Error(
      "Gmail API is not configured."
    );

    error.code =
      "GMAIL_API_CONFIG_ERROR";

    error.status = 500;

    throw error;
  }

  const rawMime =
    await buildRawMimeMessage(
      mailOptions,
      normalizedTo
    );

  const raw = rawMime
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  try {
    const response =
      await gmailApi.users.messages.send({
        userId: "me",
        requestBody: {
          raw,
        },
      });

    const messageId =
      response?.data?.id || null;

    return {
      id: messageId,
      messageId,
      threadId:
        response?.data?.threadId || null,
      transport: "gmail-api",
      accepted: Array.isArray(normalizedTo)
        ? normalizedTo
        : [normalizedTo],
      rejected: [],
    };
  } catch (error) {
    throw normalizeMailerError(error);
  }
}

// ==========================================================
// VERIFY GMAIL API
// ==========================================================

async function verifyMailer() {
  try {
    const transport =
      getTransport();

    console.log(
      "=========================================="
    );

    console.log(
      "📧 MI ARCUS EMAIL SERVICE"
    );

    console.log(
      "=========================================="
    );

    console.log(
      "Selected transport:",
      transport
    );

    console.log(
      "Provider: Gmail API over HTTPS"
    );

    console.log(
      "Gmail user:",
      GMAIL_USER
    );

    console.log(
      "Gmail scope: gmail.send"
    );

    // Refresh/validate OAuth credentials.
    // This does NOT send an email.
    await gmailClient.getAccessToken();

    console.log(
      "✅ Gmail API authentication verified"
    );

    console.log(
      "=========================================="
    );

    return true;
  } catch (error) {
    const normalized =
      normalizeMailerError(error);

    console.error(
      "=========================================="
    );

    console.error(
      "❌ MI ARCUS EMAIL SERVICE VERIFICATION FAILED"
    );

    console.error(
      "Code:",
      normalized.code
    );

    console.error(
      "Status:",
      normalized.status
    );

    console.error(
      "Message:",
      normalized.message
    );

    console.error(
      "=========================================="
    );

    return false;
  }
}

// ==========================================================
// SEND EMAIL
// ==========================================================

async function sendMail(
  mailOptions = {}
) {
  const normalizedTo =
    normalizeRecipients(
      mailOptions.to
    );

  if (!mailOptions.subject) {
    const error = new Error(
      "Email subject is missing."
    );

    error.code =
      "EMAIL_SUBJECT_MISSING";

    error.status = 400;

    throw error;
  }

  if (
    !mailOptions.html &&
    !mailOptions.text
  ) {
    const error = new Error(
      "Email content is missing."
    );

    error.code =
      "EMAIL_CONTENT_MISSING";

    error.status = 400;

    throw error;
  }

  const transport =
    getTransport();

  console.log(
    "=========================================="
  );

  console.log(
    "📧 MI ARCUS EMAIL SEND"
  );

  console.log(
    "Transport: Gmail API"
  );

  console.log(
    "Provider: Google Gmail API"
  );

  console.log(
    "From:",
    GMAIL_USER
  );

  console.log(
    "To:",
    normalizedTo
  );

  console.log(
    "Subject:",
    mailOptions.subject
  );

  console.log(
    "=========================================="
  );

  try {
    const result =
      await sendThroughGmailApi(
        mailOptions,
        normalizedTo
      );

    console.log(
      "=========================================="
    );

    console.log(
      "✅ MI ARCUS EMAIL SENT SUCCESSFULLY"
    );

    console.log(
      "Transport:",
      result?.transport ||
        "gmail-api"
    );

    console.log(
      "From:",
      GMAIL_USER
    );

    console.log(
      "To:",
      normalizedTo
    );

    console.log(
      "Subject:",
      mailOptions.subject
    );

    console.log(
      "Message ID:",
      result?.id ||
        result?.messageId ||
        "N/A"
    );

    console.log(
      "=========================================="
    );

    return result;
  } catch (error) {
    const normalizedError =
      normalizeMailerError(error);

    console.error(
      "=========================================="
    );

    console.error(
      "❌ MI ARCUS EMAIL SEND FAILED"
    );

    console.error(
      "Transport:",
      transport
    );

    console.error(
      "Provider: Gmail API"
    );

    console.error(
      "From:",
      GMAIL_USER
    );

    console.error(
      "To:",
      normalizedTo
    );

    console.error(
      "Subject:",
      mailOptions.subject
    );

    console.error(
      "Code:",
      normalizedError.code ||
        "N/A"
    );

    console.error(
      "Status:",
      normalizedError.status ||
        normalizedError.statusCode ||
        "N/A"
    );

    console.error(
      "Message:",
      normalizedError.message ||
        "Unknown email error"
    );

    if (
      normalizedError?.response?.data
    ) {
      console.error(
        "Provider Response:",
        JSON.stringify(
          normalizedError.response.data,
          null,
          2
        )
      );
    }

    console.error(
      "=========================================="
    );

    throw normalizedError;
  }
}

// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {
  sendMail,
  verifyMailer,
  normalizeMailerError,
  EMAIL_FROM,
  GMAIL_USER,
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
};