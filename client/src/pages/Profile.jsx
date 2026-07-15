import { useState, useEffect } from "react";
import axios from "axios";
import "../styles/Profile.css";
import { FaUserCircle } from "react-icons/fa";

function Profile() {

  // ===========================
  // Logged In User
  // ===========================

  const userId = localStorage.getItem("userId");

  // ===========================
  // States
  // ===========================

  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [currentPhoto, setCurrentPhoto] = useState("");

  const [storeSearch, setStoreSearch] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ===========================
  // Load User Details
  // ===========================

  useEffect(() => {

    if (!userId) return;

    axios
      .get(`http://localhost:5000/api/profile/user/${userId}`)
      .then((res) => {

        if (res.data.success) {

          const user = res.data.user;

          setName(user.name || "");
          setEmployeeId(user.employee_id || "");

          localStorage.setItem("userName", user.name);
          localStorage.setItem(
            "employeeId",
            user.employee_id || ""
          );

          if (user.profile_photo) {

            setCurrentPhoto(user.profile_photo);

            localStorage.setItem(
              "profilePhoto",
              user.profile_photo
            );

          }

        }

      })
      .catch((err) => {
        console.log(err);
      });

  }, [userId]);

  // ===========================
  // Departments
  // ===========================

  const departments = [
    "Inventory Manager",
    "City Manager",
    "New Store Opening",
    "Accounts",
    "Store Personnel",
    "Regional Head",
    "Maintenance",
    "VM",
    "ASM",
    "EA",
    "HR",
    "IT Department",
  ];

  // ===========================
  // Stores
  // ===========================

  const stores = [
    "MRPL - AYODHYA (593)",
    "MRPL - CHANDIGARH ELANTE MALL (526)",
    "MRPL - MEERUT (530)",
    "MRPL - LUDHIANA PAVILION MALL (520)",
    "MRPL - BHUBANESWAR (577)",
    "MRPL - JAIPUR (534)",
    "MRPL - DELHI JAMIA NAGAR (595)",
    "MRPL - KANPUR (521)",
    "MRPL - GORAKHPUR (562)",
    "MRPL - LUCKNOW (576)",
    "MRPL - JAMMU (561)",
    "MRPL - DEHRADUN (560)",
    "MRPL - PATIALA (591)",
    "MRPL - HISAR (556)",
    "MRPL - SURAT (575)",
    "MRPL - AMBALA (540)",
    "MRPL - MOHALI (597)",
    "MRPL - JALANDHAR (528)",
    "MRPL - KATRA (558)",
    "MRPL - RAIPUR (582)",
  ];

  // ===========================
  // Reset Password
  // ===========================

  const handlePasswordReset = () => {

    if (!newPassword || !confirmPassword) {
      alert("Please enter both password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    alert("Password reset successfully.");

    setNewPassword("");
    setConfirmPassword("");

  };

  // ===========================
  // Save Profile
  // ===========================
  // ===========================
// Save Profile
// ===========================

const handleSaveProfile = async () => {

  const formData = new FormData();

  formData.append("userId", userId);
  formData.append("name", name);
  formData.append("employeeId", employeeId);

  if (profileImage) {
    formData.append("profilePhoto", profileImage);
  }

  try {

    const response = await axios.post(
      "http://localhost:5000/api/profile/upload-photo",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (response.data.success) {

      alert("Profile Updated Successfully");

      localStorage.setItem("userName", name);
      localStorage.setItem("employeeId", employeeId);

      if (response.data.fileName) {

        localStorage.setItem(
          "profilePhoto",
          response.data.fileName
        );

        setCurrentPhoto(response.data.fileName);

      }

      // Notify Topbar to refresh instantly
      window.dispatchEvent(
        new Event("profileUpdated")
      );

    }

  } catch (error) {

    console.log(error);

    alert(
      error.response?.data?.message ||
      "Unable to update profile."
    );

  }

};

return (

<div className="profile-page">

  <h1 className="profile-heading">
    User Profile
  </h1>

  <div className="profile-card">

    {/* =======================
        Profile Photo
    ======================== */}

    <section className="photo-section">

      <h2>Profile Photo</h2>

      <p>
        Shown in the top bar next to your name.
        Square images work best.
        Max size 5 MB.
      </p>

      <div className="photo-area">

        <div className="photo-circle">

          {profileImage ? (

            <img
              src={URL.createObjectURL(profileImage)}
              alt="Profile"
              className="profile-preview"
            />

          ) : currentPhoto ? (

            <img
              src={`http://localhost:5000/uploads/${currentPhoto}`}
              alt="Profile"
              className="profile-preview"
            />

          ) : (

           <FaUserCircle className="profile-placeholder" />

          )}

        </div>

        <label className="upload-btn">

          Upload Photo

          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(e) =>
              setProfileImage(e.target.files[0])
            }
          />

        </label>

      </div>

    </section>

    {/* =======================
        User Information
    ======================== */}

    <div className="profile-grid">

      {/* Left Side */}

      <div>

        <h2>Your Information</h2>

        <label>Name</label>

        <input
          type="text"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
        />

        <label>Employee ID</label>

        <input
          type="text"
          value={employeeId}
          onChange={(e) =>
            setEmployeeId(e.target.value)
          }
        />

        <h3>Assigned Departments</h3>

        <div className="departments-box">

          <ul>

            {departments.map((dept, index) => (

              <li key={index}>
                {dept}
              </li>

            ))}

          </ul>

        </div>

      </div>

      {/* Right Side */}

      <div>

        <h2>Reset Password</h2>

        <p className="password-note">
          Use this form to reset your password.
        </p>

        <label>New Password</label>

        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) =>
            setNewPassword(e.target.value)
          }
        />

        <label>Confirm Password</label>

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) =>
            setConfirmPassword(e.target.value)
          }
        />

        <button
          className="reset-btn"
          onClick={handlePasswordReset}
        >
          Reset Password
        </button>

      </div>

    </div>
          {/* ===========================
          Assigned Stores
      =========================== */}

      <div className="stores-section">

        <div className="stores-header">

          <h2>
            Assigned Stores ({stores.length})
          </h2>

          <input
            type="text"
            placeholder="Search Store..."
            value={storeSearch}
            onChange={(e) =>
              setStoreSearch(e.target.value)
            }
          />

        </div>

        <div className="stores-box">

          <ul>

            {stores
              .filter((store) =>
                store
                  .toLowerCase()
                  .includes(
                    storeSearch.toLowerCase()
                  )
              )
              .map((store, index) => (

                <li key={index}>
                  {store}
                </li>

              ))}

          </ul>

        </div>

      </div>

      {/* ===========================
          Footer
      =========================== */}

      <div className="profile-footer">

        <button
          className="save-btn"
          onClick={handleSaveProfile}
        >
          Save Profile
        </button>

      </div>

    </div>

  </div>

);

}

export default Profile;