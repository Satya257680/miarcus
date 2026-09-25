import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { FaMapMarkerAlt, FaCheckCircle, FaShieldAlt } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const SEND_INTERVAL_MS = 60 * 1000;

const getUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.id || user?.user_id || user?.employee_id || "current";
  } catch {
    return "current";
  }
};

// One-time consent flag, per employee, on this browser.
const getConsentKey = () => `miarcus_web_location_consent_v1_${getUserId()}`;

// Stable per-browser identifier so the backend can link website location
// updates to the signed-in employee.
const getDeviceIdentifier = () => {
  const key = `miarcus_web_location_device_${getUserId()}`;
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      const raw = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      id = `web-${raw}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `web-${getUserId()}`;
  }
};

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
});

const getBrowserName = () => {
  const ua = navigator.userAgent || "";
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Browser";
};

const readPosition = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported on this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 30000,
    });
  });

const LocationIllustration = () => (
  <svg className="lc-illustration" viewBox="0 0 520 250" role="img" aria-label="Phone with a map pin next to a Mi Arcus store">
    <defs>
      <linearGradient id="lcRainbow" x1="0" x2="1">
        <stop offset="0" stopColor="#ff5b5b" /><stop offset=".3" stopColor="#ffb020" />
        <stop offset=".6" stopColor="#37c46a" /><stop offset="1" stopColor="#7b5bff" />
      </linearGradient>
    </defs>

    {/* soft cloud backdrop */}
    <path d="M92 214c-28 0-42-20-34-40 7-18 28-24 41-18 6-27 33-45 62-40 17-31 57-46 96-36 31-27 86-27 117 6 37-8 76 15 81 51 31 4 46 28 37 51-4 9-11 16-20 20H92z" fill="#e9f2fd" />
    <rect x="80" y="210" width="360" height="4" rx="2" fill="#d5e3f2" />

    {/* tree */}
    <rect x="132" y="176" width="6" height="36" rx="3" fill="#7a5a3a" />
    <circle cx="135" cy="166" r="18" fill="#6cbf4a" />
    <circle cx="123" cy="178" r="12" fill="#60ad3e" />
    <circle cx="146" cy="176" r="12" fill="#7ccb55" />

    {/* phone */}
    <rect x="168" y="24" width="112" height="198" rx="20" fill="#122a58" />
    <rect x="176" y="32" width="96" height="182" rx="12" fill="#f3f6fa" />
    <rect x="176" y="32" width="96" height="182" rx="12" fill="#dbe7f4" opacity=".5" />
    <path d="M176 150c22-8 38 10 58 4s24-16 38-10v58a12 12 0 0 1-12 12h-72a12 12 0 0 1-12-12z" fill="#cfe0f1" />
    <rect x="192" y="52" width="64" height="8" rx="4" fill="#c3d4e6" />
    <rect x="192" y="70" width="44" height="8" rx="4" fill="#d3e0ee" />
    {/* pin on phone */}
    <path d="M224 88c-15 0-27 12-27 27 0 20 27 44 27 44s27-24 27-44c0-15-12-27-27-27z" fill="#ff4d4d" />
    <circle cx="224" cy="115" r="10" fill="#fff" />

    {/* store */}
    <rect x="300" y="96" width="150" height="116" rx="8" fill="#fff" stroke="#dbe7f4" strokeWidth="2" />
    <rect x="296" y="74" width="158" height="30" rx="8" fill="url(#lcRainbow)" opacity=".92" />
    <rect x="296" y="74" width="158" height="30" rx="8" fill="#6a4bd0" opacity=".55" />
    <text x="330" y="94" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="700" fill="#fff">mi arcus</text>
    <rect x="316" y="120" width="52" height="72" rx="4" fill="#eaf2fb" />
    <rect x="384" y="120" width="52" height="72" rx="4" fill="#eaf2fb" />
    <rect x="316" y="120" width="52" height="72" rx="4" fill="none" stroke="#d5e3f2" strokeWidth="2" />
    <rect x="384" y="120" width="52" height="72" rx="4" fill="none" stroke="#d5e3f2" strokeWidth="2" />

    {/* spark marks */}
    <path d="M300 44l14 6-14 6" fill="none" stroke="#2f6bff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M322 34l4 15" fill="none" stroke="#2f6bff" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

const LocationTrackingGate = () => {
  const [showConsent, setShowConsent] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const trackingRef = useRef(false);
  const timerRef = useRef(null);

  const sendPosition = useCallback(async () => {
    try {
      const position = await readPosition();
      await axios.post(
        `${API}/api/location/update`,
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          deviceIdentifier: getDeviceIdentifier(),
        },
        authConfig()
      );
    } catch {
      // A single failed reading (permission, timeout) must not disrupt the app.
    }
  }, []);

  // Silent website tracking while the employee is signed in. Runs only after
  // consent has been given once; the browser does not prompt again.
  const startTracking = useCallback(() => {
    if (trackingRef.current) return;
    trackingRef.current = true;
    sendPosition();
    timerRef.current = window.setInterval(sendPosition, SEND_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") sendPosition();
    };
    document.addEventListener("visibilitychange", onVisible);
    startTracking._cleanup = () => document.removeEventListener("visibilitychange", onVisible);
  }, [sendPosition]);

  const loadStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/location/my-status`, authConfig());
      const data = response.data || {};
      const isRegistered = Boolean(data.registered);

      setRegistered(isRegistered);

      // Everyone signed in is tracked — employees AND administrators /
      // super admins. Admins give the same one-time consent and then
      // appear on the Employee Location map like every other user.
      const consentGiven = isRegistered || localStorage.getItem(getConsentKey()) === "1";

      if (consentGiven) {
        // Already allowed once — keep the consent flag and resume tracking
        // silently, without showing the popup again.
        localStorage.setItem(getConsentKey(), "1");
        setShowConsent(false);
        startTracking();
        return;
      }

      setShowConsent(true);
    } catch {
      // Do not interrupt normal application use if the service is unavailable.
    }
  }, [startTracking]);

  const allowLocation = async () => {
    setBusy(true);
    setMessage("");
    try {
      const position = await readPosition();

      // Register this browser once so future updates are linked to the employee.
      try {
        await axios.post(
          `${API}/api/location/device/register`,
          { deviceIdentifier: getDeviceIdentifier(), deviceName: `MIARCUS ${getBrowserName()}` },
          authConfig()
        );
      } catch {
        // Registration may already exist; continue with the location update.
      }

      await axios.post(
        `${API}/api/location/update`,
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          deviceIdentifier: getDeviceIdentifier(),
        },
        authConfig()
      );

      localStorage.setItem(getConsentKey(), "1");
      setRegistered(true);
      setShowConsent(false);
      startTracking();
    } catch (error) {
      if (error && (error.code === 1 || error.code === error.PERMISSION_DENIED)) {
        setMessage("Location permission was blocked. Please allow location in your browser and try again.");
      } else {
        setMessage("We couldn't read your location. Please check your connection and try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadStatus();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (startTracking._cleanup) startTracking._cleanup();
    };
  }, [loadStatus, startTracking]);

  if (!showConsent && registered) return null;
  if (!showConsent) return null;

  return (
    <div
      className="location-consent-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-consent-title"
    >
      <div className="location-consent-card">
        <div className="location-consent-art"><LocationIllustration /></div>

        <h2 id="location-consent-title">Allow MIARCUS to access your location</h2>
        <p>We use your location to verify that you are at the store / office.</p>

        <div className="location-consent-points">
          <div><span className="lc-ic lc-ic-pin"><FaMapMarkerAlt /></span> Location is required to continue.</div>
          <div><span className="lc-ic lc-ic-ok"><FaCheckCircle /></span> You only need to allow this once — you won't be asked again.</div>
          <div><span className="lc-ic lc-ic-shield"><FaShieldAlt /></span> Your location is visible to authorized administrators while you are signed in.</div>
        </div>

        {message && <div className="location-consent-message">{message}</div>}

        <button className="location-consent-primary" onClick={allowLocation} disabled={busy}>
          <FaMapMarkerAlt /> {busy ? "Getting location..." : "Allow Location"}
        </button>
      </div>
    </div>
  );
};

export default LocationTrackingGate;
