import {
  FaBars,
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";

import miarcusLogo from "../assets/Miarcus.png";
import "./Topbar.css";

function Topbar({ toggleSidebar }) {

  const navigate = useNavigate();

  const userId = localStorage.getItem("userId");

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [profileImage, setProfileImage] = useState("");

  const [userName, setUserName] = useState(
    localStorage.getItem("userName") || "Profile"
  );

  // ===========================
  // Load User Profile
  // ===========================

  useEffect(() => {

    const loadProfile = async () => {

      // Load instantly from localStorage
      const savedName = localStorage.getItem("userName");
      const savedPhoto = localStorage.getItem("profilePhoto");

      if (savedName) {
        setUserName(savedName);
      }

      if (savedPhoto) {
        setProfileImage(
          `http://localhost:5000/uploads/${savedPhoto}`
        );
      }

      if (!userId) return;

      try {

        const res = await axios.get(
          `http://localhost:5000/api/profile/user/${userId}`
        );

        if (res.data.success) {

          const user = res.data.user;

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
              `http://localhost:5000/uploads/${user.profile_photo}`
            );

          }

        }

      } catch (err) {

        console.log(err);

      }

    };

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

  }, [userId]);

  // ===========================
  // Logout
  // ===========================

  const confirmLogout = () => {

    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
    localStorage.removeItem("employeeId");
    localStorage.removeItem("profilePhoto");

    sessionStorage.clear();

    navigate("/");

  };

  return (
      

    <header className="topbar">

      {/* Left */}

      <div className="topbar-left">

        <button
          className="menu-btn"
          onClick={toggleSidebar}
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
            onClick={() => {

              setShowNotifications(!showNotifications);
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

              <FaUserCircle
                className="profile-icon"
              />

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
                onClick={() =>
                  setShowLogoutModal(false)
                }
              >

                Cancel

              </button>

              <button
                className="confirm-btn"
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