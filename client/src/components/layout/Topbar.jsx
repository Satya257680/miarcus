import {
  FaBars,
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import miarcusLogo from "../../assets/Miarcus.png";
import "../../styles/layout/Topbar.css";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "https://miarcus-backend.onrender.com";

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

function Topbar({ toggleSidebar }) {
  const navigate = useNavigate();

  const userId = localStorage.getItem("userId");

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [profileImage, setProfileImage] = useState(
    getPhotoUrl(localStorage.getItem("profilePhoto") || "")
  );

  const [userName, setUserName] = useState(
    localStorage.getItem("userName") || "Profile"
  );

  const loadProfile = useCallback(async () => {
    // --------------------------------------------------
    // Instant local state
    // --------------------------------------------------

    const savedName = localStorage.getItem("userName");
    const savedPhoto = localStorage.getItem("profilePhoto");

    if (savedName) {
      setUserName(savedName);
    }

    if (savedPhoto) {
      setProfileImage(getPhotoUrl(savedPhoto));
    } else {
      setProfileImage("");
    }

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

      setUserName(user.name || "Profile");
      localStorage.setItem(
        "userName",
        user.name || "Profile"
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
      console.log("Topbar profile load:", err);
    }
  }, [userId]);

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

  // ==================================================
  // LOGOUT
  // ==================================================

  const confirmLogout = () => {
    localStorage.clear();
    sessionStorage.clear();

    setShowLogoutModal(false);

    navigate("/", {
      replace: true,
    });
  };

  return (
    <header className="topbar">
      {/* Left */}
      <div className="topbar-left">
        <button
          className="menu-btn"
          onClick={toggleSidebar}
          type="button"
        >
          <FaBars />
        </button>
      </div>

      {/* Center */}
      <div className="topbar-center">
        <img
          src={miarcusLogo}
          alt="MIARCUS"
          className="topbar-logo"
        />
      </div>

      {/* Right */}
      <div className="topbar-right">
        {/* Notification */}
        <div className="dropdown">
          <button
            className="icon-btn"
            type="button"
            onClick={() => {
              setShowNotifications(
                !showNotifications
              );
              setShowProfile(false);
            }}
          >
            <FaBell />
          </button>

          {showNotifications && (
            <div className="dropdown-menu">
              <p>No new notifications</p>
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
          onClick={() =>
            setShowLogoutModal(true)
          }
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

            <p>
              Are you sure you want to logout?
            </p>

            <div className="logout-actions">
              <button
                className="cancel-btn"
                type="button"
                onClick={() =>
                  setShowLogoutModal(false)
                }
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
