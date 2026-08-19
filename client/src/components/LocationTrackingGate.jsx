import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { FaMapMarkerAlt, FaShieldAlt, FaTimes, FaCheckCircle } from "react-icons/fa";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const DEVICE_KEY = "miarcus_location_device_id";

const authConfig = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
});

const getDeviceId = () => {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = window.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
};

const LocationTrackingGate = () => {
  const [showConsent, setShowConsent] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [working, setWorking] = useState(false);
  const [schedule, setSchedule] = useState("09:00 - 18:00");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0);
  const statusRef = useRef(null);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const sendLocation = useCallback(async (position) => {
    const now = Date.now();
    if (now - lastSentRef.current < 30000) return;
    lastSentRef.current = now;

    try {
      await axios.post(
        `${API}/api/location/update`,
        {
          deviceIdentifier: localStorage.getItem(DEVICE_KEY),
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
        },
        authConfig()
      );
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        stopTracking();
      }
    }
  }, [stopTracking]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation || !registered || !working) return;
    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }, [registered, working, sendLocation]);

  const loadStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/api/location/my-status`, authConfig());
      const data = response.data || {};
      setRegistered(Boolean(data.registered));
      setWorking(Boolean(data.trackingActive));
      setSchedule(data.workHours || "09:00 - 18:00");
      statusRef.current = data;

      if (!data.registered) {
        setShowConsent(true);
        stopTracking();
      } else if (localStorage.getItem(DEVICE_KEY)) {
        setShowConsent(false);
      } else {
        setMessage("This browser needs to be registered again before location tracking can resume.");
        setShowConsent(true);
        stopTracking();
      }
    } catch {
      // Do not interrupt normal application use if the location service is unavailable.
    }
  }, [stopTracking]);

  const registerLocation = async () => {
    setBusy(true);
    setMessage("");

    if (!navigator.geolocation) {
      setMessage("This browser does not support location services. Please use a supported browser/device.");
      setBusy(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const deviceIdentifier = getDeviceId();
          await axios.post(
            `${API}/api/location/device/register`,
            { deviceIdentifier, deviceName: navigator.userAgent.slice(0, 255) },
            authConfig()
          );
          setRegistered(true);
          setShowConsent(false);
          await sendLocation(position);
        } catch (error) {
          setMessage(error.response?.data?.message || "Unable to register this device.");
        } finally {
          setBusy(false);
        }
      },
      (error) => {
        const text = error.code === 1
          ? "Location permission was denied. Please allow location for Miarcus in your browser settings."
          : error.code === 2
            ? "Your location could not be determined. Please check GPS/location services."
            : "Location permission timed out. Please try again.";
        setMessage(text);
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    loadStatus();
    const timer = setInterval(loadStatus, 60000);
    return () => {
      clearInterval(timer);
      stopTracking();
    };
  }, [loadStatus, stopTracking]);

  useEffect(() => {
    if (registered && working) startTracking();
    else stopTracking();
  }, [registered, working, startTracking, stopTracking]);

  if (!showConsent) return null;

  return (
    <div className="location-consent-backdrop" role="dialog" aria-modal="true" aria-labelledby="location-consent-title">
      <div className="location-consent-card">
        <button className="location-consent-close" onClick={() => setShowConsent(false)} aria-label="Close">
          <FaTimes />
        </button>
        <div className="location-consent-icon"><FaMapMarkerAlt /></div>
        <div className="location-consent-eyebrow"><FaShieldAlt /> Miarcus location permission</div>
        <h2 id="location-consent-title">Allow Miarcus to use your location?</h2>
        <p>
          Your device location is used only for company location tracking during the configured working hours.
          It is not collected outside that time window.
        </p>
        <div className="location-consent-points">
          <div><FaCheckCircle /> One-time device registration</div>
          <div><FaCheckCircle /> Tracking only during {schedule}</div>
          <div><FaCheckCircle /> Your registered mobile number identifies your employee account</div>
          <div><FaCheckCircle /> Only authorized administrators can view live location</div>
        </div>
        {message && <div className="location-consent-message">{message}</div>}
        <div className="location-consent-actions">
          <button className="location-consent-secondary" onClick={() => setShowConsent(false)} disabled={busy}>Not now</button>
          <button className="location-consent-primary" onClick={registerLocation} disabled={busy}>
            <FaMapMarkerAlt /> {busy ? "Registering..." : "Allow & Register Device"}
          </button>
        </div>
        <small>Changing this permission later is controlled by your browser/device location settings.</small>
      </div>
    </div>
  );
};

export default LocationTrackingGate;
