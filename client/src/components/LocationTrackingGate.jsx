import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FaMapMarkerAlt, FaShieldAlt, FaCheckCircle } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const getConsentKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const userId = user?.id || user?.user_id || user?.employee_id || "current";
    return `miarcus_mobile_location_consent_completed_v1_${userId}`;
  } catch {
    return "miarcus_mobile_location_consent_completed_v1_current";
  }
};

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
});

const LocationTrackingGate = () => {
  const [showConsent, setShowConsent] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [schedule, setSchedule] = useState("09:00 - 21:00");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [adminBypass, setAdminBypass] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/location/my-status`, authConfig());
      const data = response.data || {};
      const isRegistered = Boolean(data.registered);
      const isAdmin = Boolean(data.isAdmin);

      setRegistered(isRegistered);
      setAdminBypass(isAdmin);
      setSchedule(data.workHours || "09:00 - 21:00");
      setPhoneNumber(data.phoneNumber || "");

      // Super administrators already have location-console access and must
      // never be forced through employee mobile registration.
      if (isAdmin) {
        setShowConsent(false);
        return;
      }

      // Once the employee has completed registration, this prompt must never
      // appear again on this browser/account.
      if (isRegistered) {
        localStorage.setItem(getConsentKey(), "1");
        setShowConsent(false);
        return;
      }

      // Only show the mandatory consent dialog when it has never been
      // successfully completed. Do not poll and do not repeatedly prompt.
      setShowConsent(localStorage.getItem(getConsentKey()) !== "1");
    } catch {
      // Do not interrupt normal application use if the location service is unavailable.
    }
  }, []);

  const registerLocation = async () => {
    setBusy(true);
    setMessage("");

    if (!phoneNumber) {
      setMessage("Your registered mobile number is missing. Please contact your administrator before continuing.");
      setBusy(false);
      return;
    }

    try {
      await axios.post(
        `${API}/api/location/mobile/register`,
        { phoneNumber },
        authConfig()
      );

      setRegistered(true);
      setShowConsent(false);
      localStorage.setItem(getConsentKey(), "1");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Unable to register your mobile number for location tracking. Please contact your administrator."
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (adminBypass || !showConsent || registered) return null;

  return (
    <div
      className="location-consent-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-consent-title"
    >
      <div className="location-consent-card">
        <div className="location-consent-icon"><FaMapMarkerAlt /></div>
        <div className="location-consent-eyebrow"><FaShieldAlt /> Miarcus mobile-network permission</div>
        <h2 id="location-consent-title">Allow Miarcus to use your mobile location?</h2>
        <p>
          Your registered mobile number is used for authorized company network-location tracking
          during the configured working hours. This permission is requested only once.
        </p>
        <div className="location-consent-points">
          <div><FaCheckCircle /> One-time mobile-number registration</div>
          <div><FaCheckCircle /> Tracking only during {schedule}</div>
          <div><FaCheckCircle /> Your registered mobile number identifies your employee account</div>
          <div><FaCheckCircle /> Only authorized administrators can view live location</div>
        </div>
        {message && <div className="location-consent-message">{message}</div>}
        <div className="location-consent-actions">
          <button className="location-consent-primary" onClick={registerLocation} disabled={busy}>
            <FaMapMarkerAlt /> {busy ? "Registering..." : "Allow & Register Mobile"}
          </button>
        </div>
        <small>This permission is requested once. After successful registration, Miarcus will not show this popup again.</small>
      </div>
    </div>
  );
};

export default LocationTrackingGate;
