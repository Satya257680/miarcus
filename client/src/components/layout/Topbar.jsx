import {
  FaBars,
  FaUserCircle,
  FaSignOutAlt,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import axios, { API_BASE_URL } from "../../axiosConfig.js";

import miarcusLogo from "../../assets/Miarcus.png";
import NotificationCenter from "../common/NotificationCenter";

import "../../styles/layout/Topbar.css";

// Keep Topbar API calls and the rest of the application on
// the exact same configured backend URL.
const API = (
  axios.defaults.baseURL ||
  import.meta.env.VITE_API_URL ||
  API_BASE_URL
).replace(/\/+$/, "");

// ============================================================
// PROFILE PHOTO URL
// ============================================================

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

// ============================================================
// TOPBAR
// ============================================================

function Topbar({ toggleSidebar }) {
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId");

  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [profileImage, setProfileImage] = useState(
    getPhotoUrl(localStorage.getItem("profilePhoto") || "")
  );

  const [userName, setUserName] = useState(
    localStorage.getItem("userName") || "Profile"
  );

  // ==========================================================
  // PROFILE
  // ==========================================================

  const loadProfile = useCallback(async () => {
    const savedName = localStorage.getItem("userName");
    const savedPhoto = localStorage.getItem("profilePhoto");

    if (savedName) {
      setUserName(savedName);
    }

    setProfileImage(
      savedPhoto ? getPhotoUrl(savedPhoto) : ""
    );

    if (!userId) return;

    const token = localStorage.getItem("token");

    if (!token) return;

    try {
      const response = await axios.get(
        `${API}/api/profile/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.data?.success) return;

      const user = response.data.user || {};

      const updatedName = user.name || "Profile";

      setUserName(updatedName);

      localStorage.setItem(
        "userName",
        updatedName
      );

      if (user.profile_photo) {
        localStorage.setItem(
          "profilePhoto",
          user.profile_photo
        );

        setProfileImage(
          getPhotoUrl(user.profile_photo)
        );
      }
    } catch (err) {
      console.log(
        "Topbar profile load:",
        err
      );
    }
  }, [userId]);

  // ==========================================================
  // PROFILE EVENT
  // ==========================================================

  useEffect(() => {
    loadProfile();

    window.addEventListener(
      "profileUpdated",
      loadProfile
    );

    return () => {
      window.removeEventListener(
        "profileUpdated",
        loadProfile
      );
    };
  }, [loadProfile]);

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const confirmLogout = async () => {
    try {
      const token = localStorage.getItem("token");

      /*
       * Ask the backend to invalidate the refresh session.
       * This is intentionally best-effort. Even if the request
       * fails because the token is already expired, the client
       * session is still cleared below.
       */
      if (token) {
        try {
          await axios.post(
            `${API}/api/auth/logout`,
            {},
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              withCredentials: true,
            }
          );
        } catch (logoutError) {
          console.log(
            "Server logout request:",
            logoutError
          );
        }
      }
    } finally {
      // Clear all local authentication/session information.
      localStorage.clear();
      sessionStorage.clear();

      setShowLogoutModal(false);

      navigate("/", {
        replace: true,
      });
    }
  };

  // ==========================================================
  // CLOSE PROFILE WHEN CLICKING OUTSIDE
  // ==========================================================

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const target = event.target;

      if (
        target.closest &&
        !target.closest(".topbar-profile-wrapper")
      ) {
        setShowProfile(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <header className="topbar">
      {/* ======================================================
          LEFT
      ====================================================== */}

      <div className="topbar-left">
        <button
          className="menu-btn"
          onClick={toggleSidebar}
          type="button"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
        >
          <FaBars />
        </button>
      </div>

      {/* ======================================================
          CENTER LOGO
      ====================================================== */}

      <div className="topbar-center">
        <img
          src={miarcusLogo}
          alt="MIARCUS"
          className="topbar-logo"
        />
      </div>

      {/* ======================================================
          RIGHT
      ====================================================== */}

      <div className="topbar-right">

        {/* ====================================================
            GLOBAL NOTIFICATION CENTER

            This replaces the previous custom notification
            bell, notification API calls and SSE connection.

            NotificationCenter handles:
            - unread count
            - refresh
            - 30-second refresh
            - mark one as read
            - mark all as read
            - clear one
            - clear all
            - notification navigation
        ==================================================== */}

        <NotificationCenter />

        {/* ====================================================
            PROFILE
        ==================================================== */}

        <div className="dropdown topbar-profile-wrapper">
          <button
            className="profile-btn"
            type="button"
            onClick={() => {
              setShowProfile(
                (previous) => !previous
              );
            }}
            aria-label="Open profile menu"
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
              {/* ==================================================
                  PROFILE
              ================================================== */}

              <p
                onClick={() => {
                  setShowProfile(false);
                  navigate("/profile");
                }}
              >
                My Profile
              </p>

              {/* ==================================================
                  LOGOUT
              ================================================== */}

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

        {/* ====================================================
            LOGOUT BUTTON
        ==================================================== */}

        <button
          className="logout-btn"
          type="button"
          onClick={() =>
            setShowLogoutModal(true)
          }
          aria-label="Logout"
          title="Logout"
        >
          <FaSignOutAlt />

          <span>Logout</span>
        </button>
      </div>

      {/* ======================================================
          LOGOUT MODAL
      ====================================================== */}

      {showLogoutModal && (
        <div className="logout-overlay">
          <div
            className="logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <h3 id="logout-title">
              Logout
            </h3>

            <p>
              Are you sure you want to logout?
            </p>

            <div className="logout-actions">
              {/* ==================================================
                  CANCEL
              ================================================== */}

              <button
                className="cancel-btn"
                type="button"
                onClick={() =>
                  setShowLogoutModal(false)
                }
              >
                Cancel
              </button>

              {/* ==================================================
                  CONFIRM
              ================================================== */}

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