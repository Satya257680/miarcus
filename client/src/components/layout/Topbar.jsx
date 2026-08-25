import { API_BASE_URL } from "../../axiosConfig.js";
import {
  FaBars,
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
  FaCheckDouble,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import axios, { API_BASE_URL } from "../../axiosConfig";
import miarcusLogo from "../../assets/Miarcus.png";
import "../../styles/layout/Topbar.css";

// Keep Topbar API calls and the rest of the application on
// the exact same configured backend URL.
const API = (
  axios.defaults.baseURL ||
  import.meta.env.VITE_API_URL ||
  API_BASE_URL
).replace(/\/+$/, "");

const getPhotoUrl = (photo) => {
  if (!photo) return "";

  if (
    photo.startsWith("data:") ||
    photo.startsWith("blob:") ||
    photo.startsWith("http://") ||
    photo.startsWith("https://")
  ) {
    return photo;
  }

  return `${API}/uploads/${photo}`;
};

const formatNotificationTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function Topbar({ toggleSidebar }) {
  const navigate = useNavigate();
  const streamRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const userId = localStorage.getItem("userId");

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const [profileImage, setProfileImage] = useState(
    getPhotoUrl(localStorage.getItem("profilePhoto") || "")
  );

  const [userName, setUserName] = useState(
    localStorage.getItem("userName") || "Profile"
  );

  // ==================================================
  // PROFILE
  // ==================================================

  const loadProfile = useCallback(async () => {
    const savedName = localStorage.getItem("userName");
    const savedPhoto = localStorage.getItem("profilePhoto");

    if (savedName) setUserName(savedName);
    setProfileImage(savedPhoto ? getPhotoUrl(savedPhoto) : "");

    if (!userId) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await axios.get(`${API}/api/profile/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.data?.success) return;

      const user = response.data.user || {};

      setUserName(user.name || "Profile");
      localStorage.setItem("userName", user.name || "Profile");

      if (user.profile_photo) {
        localStorage.setItem("profilePhoto", user.profile_photo);
        setProfileImage(getPhotoUrl(user.profile_photo));
      }
    } catch (err) {
      console.log("Topbar profile load:", err);
    }
  }, [userId]);

  // ==================================================
  // LOAD NOTIFICATIONS
  // ==================================================

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !userId) return;

    try {
      setNotificationLoading(true);

      const response = await axios.get(
        `${API}/api/notifications?limit=30`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.data?.success) return;

      setNotifications(response.data.notifications || []);
      setUnreadCount(Number(response.data.unreadCount || 0));
    } catch (error) {
      console.error("Notification load error:", error);
    } finally {
      setNotificationLoading(false);
    }
  }, [userId]);

  // ==================================================
  // REAL-TIME SSE CONNECTION
  // ==================================================

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token || !userId) return undefined;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      const streamUrl =
        `${API}/api/notifications/stream?token=` +
        encodeURIComponent(token);

      const source = new EventSource(streamUrl);
      streamRef.current = source;

      source.addEventListener("notification", (event) => {
        try {
          const notification = JSON.parse(event.data);

          setNotifications((previous) => {
            const withoutDuplicate = previous.filter(
              (item) => item.id !== notification.id
            );

            return [notification, ...withoutDuplicate].slice(0, 30);
          });

          setUnreadCount((previous) => previous + 1);
        } catch (error) {
          console.error("Notification event parse error:", error);
        }
      });

      source.onerror = () => {
        source.close();

        if (!cancelled) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimerRef.current);
      streamRef.current?.close();
      streamRef.current = null;
    };
  }, [API, userId]);

  useEffect(() => {
    loadProfile();
    loadNotifications();

    window.addEventListener("profileUpdated", loadProfile);

    return () => {
      window.removeEventListener("profileUpdated", loadProfile);
    };
  }, [loadProfile, loadNotifications]);

  // ==================================================
  // NOTIFICATION ACTIONS
  // ==================================================

  const markNotificationRead = async (notification) => {
    if (notification.is_read) {
      if (notification.link) navigate(notification.link);
      setShowNotifications(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await axios.put(
        `${API}/api/notifications/${notification.id}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true }
            : item
        )
      );

      setUnreadCount((previous) => Math.max(0, previous - 1));

      if (notification.link) navigate(notification.link);
      setShowNotifications(false);
    } catch (error) {
      console.error("Mark notification read error:", error);
    }
  };

  const markAllNotificationsRead = async () => {
    const token = localStorage.getItem("token");
    if (!token || unreadCount === 0) return;

    try {
      await axios.put(
        `${API}/api/notifications/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Mark all notifications read error:", error);
    }
  };

  // ==================================================
  // LOGOUT
  // ==================================================

  const confirmLogout = () => {
    streamRef.current?.close();

    localStorage.clear();
    sessionStorage.clear();

    setShowLogoutModal(false);
    navigate("/", { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="menu-btn"
          onClick={toggleSidebar}
          type="button"
        >
          <FaBars />
        </button>
      </div>

      <div className="topbar-center">
        <img
          src={miarcusLogo}
          alt="MIARCUS"
          className="topbar-logo"
        />
      </div>

      <div className="topbar-right">
        {/* ==================================================
            REAL-TIME NOTIFICATIONS
        ================================================== */}
        <div className="dropdown notification-dropdown">
          <button
            className="icon-btn notification-icon-btn"
            type="button"
            aria-label="Notifications"
            onClick={() => {
              setShowNotifications((previous) => !previous);
              setShowProfile(false);
            }}
          >
            <FaBell />

            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-menu">
              <div className="notification-header">
                <div>
                  <strong>Notifications</strong>
                  <span>
                    {unreadCount} unread
                  </span>
                </div>

                <button
                  type="button"
                  className="mark-all-btn"
                  onClick={markAllNotificationsRead}
                  disabled={unreadCount === 0}
                  title="Mark all as read"
                >
                  <FaCheckDouble />
                </button>
              </div>

              <div className="notification-list">
                {notificationLoading ? (
                  <div className="notification-empty">
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="notification-empty">
                    <FaBell />
                    <span>No notifications yet</span>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      type="button"
                      key={notification.id}
                      className={`notification-item ${
                        notification.is_read ? "read" : "unread"
                      }`}
                      onClick={() =>
                        markNotificationRead(notification)
                      }
                    >
                      <span className="notification-dot" />

                      <span className="notification-content">
                        <strong>{notification.title}</strong>
                        <span>{notification.message}</span>
                        <small>
                          {formatNotificationTime(
                            notification.created_at
                          )}
                        </small>
                      </span>
                    </button>
                  ))
                )}
              </div>

              <div className="notification-footer">
                <button
                  type="button"
                  onClick={loadNotifications}
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="dropdown">
          <button
            className="profile-btn"
            type="button"
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
          >
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="topbar-profile-img"
              />
            ) : (
              <FaUserCircle className="profile-icon" />
            )}

            <span>{userName}</span>
          </button>

          {showProfile && (
            <div className="dropdown-menu">
              <p
                onClick={() => {
                  setShowProfile(false);
                  navigate("/profile");
                }}
              >
                My Profile
              </p>

              <p
                onClick={() => {
                  setShowProfile(false);
                  setShowLogoutModal(true);
                }}
              >
                Logout
              </p>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          className="logout-btn"
          type="button"
          onClick={() => setShowLogoutModal(true)}
        >
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="logout-overlay">
          <div className="logout-modal">
            <h3>Logout</h3>

            <p>Are you sure you want to logout?</p>

            <div className="logout-actions">
              <button
                className="cancel-btn"
                type="button"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>

              <button
                className="confirm-btn"
                type="button"
                onClick={confirmLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Topbar;
