import React from "react";

const Terms = () => {
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
          Terms of Service
        </h1>

        <p style={{ color: "#6b7280", marginBottom: "30px" }}>
          Last Updated: September 19, 2026
        </p>

        <p>
          These Terms of Service govern your use of the MIARCUS platform. By
          accessing or using MIARCUS, you agree to comply with these terms.
        </p>

        <h2>1. Use of the Service</h2>
        <p>
          MIARCUS is a business management platform designed to support
          authorized users with operational, administrative, reporting,
          communication, and related business activities.
        </p>

        <h2>2. Account Responsibility</h2>
        <p>
          Users are responsible for maintaining the confidentiality of their
          account credentials and for all activities performed through their
          authorized account.
        </p>

        <h2>3. Email Notifications</h2>
        <p>
          MIARCUS may send account-related, operational, security, and other
          authorized business notifications by email.
        </p>

        <p>
          The Gmail integration is used only for sending authorized emails
          through the configured MIARCUS notification account. MIARCUS does
          not use this integration to read or manage the user's Gmail inbox.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>
          Users must not use MIARCUS to send unlawful, fraudulent, abusive,
          misleading, unauthorized, or otherwise prohibited communications.
        </p>

        <h2>5. Security</h2>
        <p>
          Users must take reasonable steps to protect their account credentials
          and must immediately report suspected unauthorized access or
          security issues to the appropriate administrator.
        </p>

        <h2>6. Service Availability</h2>
        <p>
          We make reasonable efforts to keep MIARCUS available and functional.
          However, temporary interruptions may occur because of maintenance,
          infrastructure issues, network problems, or third-party services.
        </p>

        <h2>7. Third-Party Services</h2>
        <p>
          MIARCUS may rely on third-party services, including Google APIs,
          hosting providers, and other infrastructure services. Their
          availability and policies may affect certain MIARCUS features.
        </p>

        <h2>8. Changes to the Service</h2>
        <p>
          MIARCUS features, functionality, and these Terms of Service may be
          updated from time to time. Continued use of the service after changes
          are published constitutes continued acceptance of the applicable
          terms.
        </p>

        <h2>9. Contact</h2>
        <p>
          For questions regarding these Terms of Service or the MIARCUS email
          service, contact:
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

export default Terms;