import React from "react";

const PrivacyPolicy = () => {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fa",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
        color: "#1f2937",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          background: "#ffffff",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        <h1
          style={{
            color: "#1f4e5f",
            marginBottom: "10px",
          }}
        >
          Privacy Policy
        </h1>

        <p style={{ color: "#6b7280", marginBottom: "30px" }}>
          Last Updated: September 19, 2026
        </p>

        <p>
          This Privacy Policy explains how MIARCUS ("we", "our", or "the
          service") handles information when you use the MIARCUS platform.
        </p>

        <h2>1. Information We Handle</h2>
        <p>
          Depending on the features you use, MIARCUS may handle information
          such as your name, email address, employee information, account
          information, and information submitted through the platform.
        </p>

        <h2>2. Email Service</h2>
        <p>
          MIARCUS uses the Google Gmail API to send system and account-related
          email notifications.
        </p>

        <p>
          The Gmail integration uses the{" "}
          <strong>gmail.send</strong> permission only for sending emails on
          behalf of the configured MIARCUS notification account.
        </p>

        <p>
          MIARCUS does <strong>not</strong> use the Gmail integration to read,
          modify, delete, or manage emails in the Gmail inbox.
        </p>

        <h2>3. Email Information</h2>
        <p>
          When MIARCUS sends an email, information such as the recipient email
          address, email subject, and email content may be processed by the
          email service in order to deliver the message.
        </p>

        <h2>4. Data Security</h2>
        <p>
          Authentication credentials, OAuth tokens, API credentials, and other
          sensitive configuration information are stored on secured server
          infrastructure and are not intentionally exposed to ordinary users
          of the platform.
        </p>

        <h2>5. Third-Party Services</h2>
        <p>
          MIARCUS may use third-party services such as Google APIs and hosting
          or infrastructure providers to operate its features. These services
          process information according to their own applicable policies.
        </p>

        <h2>6. Data Retention</h2>
        <p>
          Information is retained only as necessary to provide the MIARCUS
          service, maintain accounts, support business operations, comply with
          applicable requirements, and maintain system records.
        </p>

        <h2>7. User Responsibilities</h2>
        <p>
          Users are responsible for providing accurate information and using
          the MIARCUS platform in accordance with applicable laws and company
          policies.
        </p>

        <h2>8. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy when necessary. The updated
          version will be published on this page with a revised "Last Updated"
          date.
        </p>

        <h2>9. Contact</h2>
        <p>
          For questions regarding this Privacy Policy or the MIARCUS email
          integration, contact:
        </p>

        <p>
          <strong>Email:</strong>{" "}
          <a
            href="mailto:miarcus.notifications@gmail.com"
            style={{ color: "#2563eb" }}
          >
            miarcus.notifications@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;