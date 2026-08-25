import { useEffect, useMemo, useState } from "react";
import axios from "../axiosConfig";
import "../styles/Profile.css";
import { FaUserCircle, FaSave, FaKey, FaStore } from "react-icons/fa";

// Use the exact same backend URL configured by axiosConfig.
// This prevents the deployed Vercel profile page from falling
// back to localhost and showing "Network Error".
const API =
    (axios.defaults.baseURL ||
        import.meta.env.VITE_API_URL ||
        "https://miarcus-backend.onrender.com"
    ).replace(/\/+$/, "");

const getToken = () =>
    localStorage.getItem("token") || "";

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

const authConfig = () => ({
    headers: {
        Authorization: `Bearer ${getToken()}`,
    },
});

// ======================================================
// COMPRESS PROFILE PHOTO
// Keeps the DB record small and makes profile persistence
// practical even when users upload large phone photos.
// ======================================================

const prepareProfileImage = (file) =>
    new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }

        if (!file.type.startsWith("image/")) {
            reject(new Error("Please select an image file."));
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            const image = new Image();

            image.onload = () => {
                const maxSize = 900;
                const ratio = Math.min(
                    1,
                    maxSize / Math.max(image.width, image.height)
                );

                const canvas = document.createElement("canvas");
                canvas.width = Math.max(
                    1,
                    Math.round(image.width * ratio)
                );
                canvas.height = Math.max(
                    1,
                    Math.round(image.height * ratio)
                );

                const context = canvas.getContext("2d");

                if (!context) {
                    reject(new Error("Unable to process the image."));
                    return;
                }

                context.drawImage(
                    image,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(
                                new Error(
                                    "Unable to prepare the profile photo."
                                )
                            );
                            return;
                        }

                        resolve(
                            new File(
                                [blob],
                                "profile-photo.jpg",
                                {
                                    type: "image/jpeg",
                                }
                            )
                        );
                    },
                    "image/jpeg",
                    0.82
                );
            };

            image.onerror = () =>
                reject(new Error("Unable to read the selected image."));

            image.src = reader.result;
        };

        reader.onerror = () =>
            reject(new Error("Unable to read the selected image."));

        reader.readAsDataURL(file);
    });

function Profile() {
    const userId = localStorage.getItem("userId");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [name, setName] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [email, setEmail] = useState("");
    const [department, setDepartment] = useState("");
    const [designation, setDesignation] = useState("");
    const [reportsTo, setReportsTo] = useState("");

    const [stores, setStores] = useState([]);
    const [storeSearch, setStoreSearch] = useState("");

    const [currentPhoto, setCurrentPhoto] = useState(
        localStorage.getItem("profilePhoto") || ""
    );

    const [profileImage, setProfileImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(
        getPhotoUrl(localStorage.getItem("profilePhoto") || "")
    );

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // ======================================================
    // LOAD PROFILE FROM DATABASE
    // ======================================================

    const loadProfile = async () => {
        if (!userId || !getToken()) {
            setLoading(false);
            setError("Your session has expired. Please login again.");
            return;
        }

        try {
            setError("");

            const response = await axios.get(
                `${API}/api/profile/me`,
                authConfig()
            );

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message ||
                        "Unable to load profile."
                );
            }

            const user = response.data.user || {};

            setName(user.name || "");
            setEmployeeId(user.employee_id || "");
            setEmail(user.email || "");
            setDepartment(user.department || "");
            setDesignation(user.designation || "");
            setReportsTo(user.reports_to || "");
            setStores(Array.isArray(user.stores) ? user.stores : []);

            if (user.profile_photo) {
                setCurrentPhoto(user.profile_photo);
                setPreviewUrl(getPhotoUrl(user.profile_photo));
                localStorage.setItem(
                    "profilePhoto",
                    user.profile_photo
                );
            } else {
                setCurrentPhoto("");
                setPreviewUrl("");
                localStorage.removeItem("profilePhoto");
            }

            localStorage.setItem(
                "userName",
                user.name || "Profile"
            );

            localStorage.setItem(
                "employeeId",
                user.employee_id || ""
            );

            const existingUser = JSON.parse(
                localStorage.getItem("user") || "{}"
            );

            localStorage.setItem(
                "user",
                JSON.stringify({
                    ...existingUser,
                    id: user.id,
                    name: user.name || "",
                    employee_id: user.employee_id || "",
                    email: user.email || "",
                    profile_photo: user.profile_photo || "",
                    department_id: user.department_id || null,
                    designation_id: user.designation_id || null,
                })
            );
        } catch (err) {
            console.error("Profile load error:", err);

            setError(
                err.response?.data?.message ||
                    err.message ||
                    "Unable to load profile."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
        // userId is the stable logged-in-user identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // ======================================================
    // PHOTO SELECT
    // ======================================================

    const handlePhotoChange = async (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        try {
            setError("");
            const prepared = await prepareProfileImage(file);
            setProfileImage(prepared);

            const localPreview = URL.createObjectURL(prepared);
            setPreviewUrl(localPreview);
        } catch (err) {
            setProfileImage(null);
            setError(err.message || "Unable to select photo.");
        }
    };

    // ======================================================
    // SAVE PROFILE
    // ======================================================

    const handleSaveProfile = async () => {
        if (!name.trim()) {
            setError("Name is required.");
            return;
        }

        try {
            setSaving(true);
            setError("");
            setMessage("");

            const formData = new FormData();

            formData.append("name", name.trim());
            formData.append("employeeId", employeeId.trim());

            if (profileImage) {
                formData.append("profilePhoto", profileImage);
            }

            const response = await axios.put(
                `${API}/api/profile/me`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${getToken()}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message ||
                        "Unable to update profile."
                );
            }

            const user = response.data.user || {};

            setName(user.name || name);
            setEmployeeId(
                user.employee_id || employeeId
            );

            if (user.profile_photo) {
                setCurrentPhoto(user.profile_photo);
                setPreviewUrl(getPhotoUrl(user.profile_photo));
                localStorage.setItem(
                    "profilePhoto",
                    user.profile_photo
                );
            }

            localStorage.setItem(
                "userName",
                user.name || name
            );

            localStorage.setItem(
                "employeeId",
                user.employee_id || employeeId
            );

            const existingUser = JSON.parse(
                localStorage.getItem("user") || "{}"
            );

            localStorage.setItem(
                "user",
                JSON.stringify({
                    ...existingUser,
                    name: user.name || name,
                    employee_id:
                        user.employee_id || employeeId,
                    profile_photo:
                        user.profile_photo ||
                        existingUser.profile_photo ||
                        "",
                })
            );

            setProfileImage(null);
            setMessage("Profile saved successfully.");

            window.dispatchEvent(
                new Event("profileUpdated")
            );
        } catch (err) {
            console.error("Profile save error:", err);

            setError(
                err.response?.data?.message ||
                    err.message ||
                    "Unable to update profile."
            );
        } finally {
            setSaving(false);
        }
    };

    // ======================================================
    // PASSWORD
    // ======================================================

    const handlePasswordReset = async () => {
        if (!currentPassword) {
            setError("Enter your current password.");
            return;
        }

        if (!newPassword || !confirmPassword) {
            setError("Enter and confirm the new password.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        if (newPassword.length < 10) {
            setError("New password must contain at least 10 characters.");
            return;
        }

        try {
            setPasswordSaving(true);
            setError("");
            setMessage("");

            const response = await axios.put(
                `${API}/api/profile/password`,
                {
                    currentPassword,
                    newPassword,
                },
                authConfig()
            );

            if (!response.data?.success) {
                throw new Error(
                    response.data?.message ||
                        "Unable to update password."
                );
            }

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setMessage("Password updated successfully.");
        } catch (err) {
            console.error("Password update error:", err);

            setError(
                err.response?.data?.message ||
                    err.message ||
                    "Unable to update password."
            );
        } finally {
            setPasswordSaving(false);
        }
    };

    const filteredStores = useMemo(() => {
        const query = storeSearch.trim().toLowerCase();

        if (!query) return stores;

        return stores.filter((store) =>
            `${store.store_name || ""} ${store.location || ""} ${
                store.city || ""
            } ${store.state || ""}`
                .toLowerCase()
                .includes(query)
        );
    }, [stores, storeSearch]);

    if (loading) {
        return (
            <div className="profile-page">
                <h1 className="profile-heading">User Profile</h1>
                <div className="profile-card profile-loading">
                    Loading your profile...
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <h1 className="profile-heading">User Profile</h1>

            {error && (
                <div className="profile-message profile-message-error">
                    {error}
                </div>
            )}

            {message && (
                <div className="profile-message profile-message-success">
                    {message}
                </div>
            )}

            <div className="profile-card">
                {/* ==================================================
                    PROFILE PHOTO
                ================================================== */}

                <section className="photo-section">
                    <h2>Profile Photo</h2>

                    <p>
                        Your photo is stored with your account and remains
                        connected to your user profile after refreshes and
                        application updates.
                    </p>

                    <div className="photo-area">
                        <div className="photo-circle">
                            {previewUrl ? (
                                <img
                                    src={previewUrl}
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
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handlePhotoChange}
                            />
                        </label>
                    </div>
                </section>

                <div className="profile-grid">
                    {/* ==================================================
                        USER INFORMATION
                    ================================================== */}

                    <div>
                        <h2>Your Information</h2>

                        <label>Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />

                        <label>Employee ID</label>
                        <input
                            type="text"
                            value={employeeId}
                            onChange={(e) =>
                                setEmployeeId(e.target.value)
                            }
                        />

                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            readOnly
                        />

                        <div className="profile-readonly-grid">
                            <div>
                                <span>Department</span>
                                <strong>
                                    {department || "Not assigned"}
                                </strong>
                            </div>

                            <div>
                                <span>Designation</span>
                                <strong>
                                    {designation || "Not assigned"}
                                </strong>
                            </div>
                        </div>

                        <label>Reports To</label>
                        <input
                            type="text"
                            value={reportsTo || "Not assigned"}
                            disabled
                            readOnly
                        />
                    </div>

                    {/* ==================================================
                        PASSWORD
                    ================================================== */}

                    <div>
                        <h2>Change Password</h2>

                        <p className="password-note">
                            Change your own password securely. Your password
                            is never stored in the browser.
                        </p>

                        <label>Current Password</label>
                        <input
                            type="password"
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChange={(e) =>
                                setCurrentPassword(e.target.value)
                            }
                        />

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
                            disabled={passwordSaving}
                        >
                            <FaKey />
                            {passwordSaving
                                ? "Updating..."
                                : "Update Password"}
                        </button>
                    </div>
                </div>

                {/* ==================================================
                    ASSIGNED STORES
                ================================================== */}

                <div className="stores-section">
                    <div className="stores-header">
                        <h2>
                            <FaStore /> Assigned Stores ({stores.length})
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
                        {filteredStores.length ? (
                            <ul>
                                {filteredStores.map((store) => (
                                    <li key={store.id}>
                                        <strong>
                                            {store.store_name ||
                                                "Unnamed Store"}
                                        </strong>

                                        {(store.location ||
                                            store.city ||
                                            store.state) && (
                                            <small>
                                                {[
                                                    store.location,
                                                    store.city,
                                                    store.state,
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ")}
                                            </small>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="profile-empty-state">
                                No stores are assigned to this user.
                            </div>
                        )}
                    </div>
                </div>

                {/* ==================================================
                    SAVE
                ================================================== */}

                <div className="profile-footer">
                    <button
                        className="save-btn"
                        onClick={handleSaveProfile}
                        disabled={saving}
                    >
                        <FaSave />
                        {saving ? "Saving..." : "Save Profile"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Profile;
