import PremiumLoader from "../components/premium/PremiumLoader";
import { useEffect, useMemo, useState } from "react";
import axios, { API_BASE_URL } from "../axiosConfig.js";
import "../styles/Profile.css";
import "../styles/premium/PagePremium.css";
import "../styles/premium/AdminPagesPremium.css";
import InsightStrip from "../components/premium/InsightStrip";
import { initials, avatarTone, formatCount } from "../utils/premiumFormat";
import {
    FaSave,
    FaKey,
    FaStore,
    FaCamera,
    FaBuilding,
    FaIdBadge,
    FaUserEdit,
    FaShieldAlt,
    FaLock,
    FaSearch,
    FaMapMarkerAlt,
} from "react-icons/fa";

// Use the exact same backend URL configured by axiosConfig.
// This prevents the deployed Vercel profile page from falling
// back to localhost and showing "Network Error".
const API =
    (axios.defaults.baseURL ||
        import.meta.env.VITE_API_URL ||
        API_BASE_URL
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

        const passwordPolicy = /^(?=.{8,10}$)(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

        if (!passwordPolicy.test(newPassword)) {
            setError("New password must be 8–10 characters and include uppercase, lowercase, number, and special character.");
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

    const passwordStrength = (() => {
        if (!newPassword) return { score: 0, label: "" };
        let score = 0;
        if (newPassword.length >= 8) score += 1;
        if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;
        if (/\d/.test(newPassword)) score += 1;
        if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
        return { score, label: ["Too short", "Weak", "Fair", "Good", "Strong"][score] };
    })();

    const profileCompletion = Math.round(
        ([name, employeeId, email, department, designation, reportsTo, previewUrl]
            .filter((value) => String(value || "").trim()).length / 7) * 100
    );

    const passwordsMismatch =
        Boolean(confirmPassword) && newPassword !== confirmPassword;

    if (loading) {
        return (
            <div className="pf-page pp-premium">
                <div className="pf-card pf-loading"><PremiumLoader compact title="Loading your profile" /></div>
            </div>
        );
    }

    return (
        <div className="pf-page pp-premium">

            {/* ==================================================
                HERO — identity card
            ================================================== */}

            <section className="pp-hero pf-hero">
                <span className="pp-hero-orb pp-hero-orb--a" aria-hidden="true" />
                <span className="pp-hero-orb pp-hero-orb--b" aria-hidden="true" />
                <span className="pp-hero-grid" aria-hidden="true" />

                <div className="pf-hero-main">
                    <div className="pf-avatar-wrap">
                        <div className="pf-avatar">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Profile" />
                            ) : (
                                <span className="pf-avatar-initials">{initials(name)}</span>
                            )}
                        </div>

                        <label className="pf-avatar-edit" title="Upload photo">
                            <FaCamera />
                            <input
                                type="file"
                                hidden
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handlePhotoChange}
                            />
                        </label>
                    </div>

                    <div className="pp-hero-copy">
                        <span className="pp-hero-eyebrow">My account · Profile</span>

                        <div className="pp-hero-title-row">
                            <h1 className="pp-hero-title">{name || "Your profile"}</h1>
                            {designation && (
                                <span className="pp-hero-badge pp-hero-badge--gold">{designation}</span>
                            )}
                        </div>

                        <p className="pp-hero-subtitle">
                            {email || "No email on file"}
                        </p>

                        <div className="pp-hero-meta">
                            <span className="pp-hero-chip">
                                <span className="pp-hero-chip-label">Employee ID</span>
                                <strong className="pp-hero-chip-value">{employeeId || "—"}</strong>
                            </span>
                            <span className="pp-hero-chip">
                                <span className="pp-hero-chip-label">Department</span>
                                <strong className="pp-hero-chip-value">{department || "Not assigned"}</strong>
                            </span>
                            <span className="pp-hero-chip">
                                <span className="pp-hero-chip-label">Reports to</span>
                                <strong className="pp-hero-chip-value">{reportsTo || "Not assigned"}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="pp-hero-actions">
                    <label className="pp-hero-btn">
                        <FaCamera /> Upload Photo
                        <input
                            type="file"
                            hidden
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handlePhotoChange}
                        />
                    </label>

                    <button
                        type="button"
                        className="pp-hero-btn pp-hero-btn--solid"
                        onClick={handleSaveProfile}
                        disabled={saving}
                    >
                        <FaSave /> {saving ? "Saving..." : "Save Profile"}
                    </button>
                </div>
            </section>

            <InsightStrip
                items={[
                    { key: "stores", label: "Assigned stores", value: formatCount(stores.length), hint: "Stores you can access", tone: "violet", icon: FaStore },
                    { key: "cities", label: "Cities", value: formatCount(new Set(stores.map((s) => s.city).filter(Boolean)).size), hint: "Across your stores", tone: "blue", icon: FaMapMarkerAlt },
                    { key: "states", label: "States", value: formatCount(new Set(stores.map((s) => s.state).filter(Boolean)).size), hint: "Regions covered", tone: "amber", icon: FaBuilding },
                    { key: "complete", label: "Profile complete", value: `${profileCompletion}%`, hint: profileCompletion === 100 ? "All details on file" : "Add the missing details", tone: profileCompletion === 100 ? "green" : "red", icon: FaIdBadge }
                ]}
            />

            {error && (
                <div className="pf-alert pf-alert--error" role="alert">
                    {error}
                </div>
            )}

            {message && (
                <div className="pf-alert pf-alert--success" role="status">
                    {message}
                </div>
            )}

            <div className="pf-grid">

                {/* ==================================================
                    USER INFORMATION
                ================================================== */}

                <section className="pf-card">
                    <header className="pf-card-head">
                        <span className="pf-card-icon"><FaUserEdit /></span>
                        <div>
                            <h2>Your Information</h2>
                            <p>Update how your name and employee ID appear across MIARCUS.</p>
                        </div>
                    </header>

                    <div className="pf-fields">
                        <div className="pf-field">
                            <label htmlFor="pf-name">Name</label>
                            <input
                                id="pf-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="pf-field">
                            <label htmlFor="pf-emp">Employee ID</label>
                            <input
                                id="pf-emp"
                                type="text"
                                value={employeeId}
                                onChange={(e) =>
                                    setEmployeeId(e.target.value)
                                }
                            />
                        </div>

                        <div className="pf-field pf-field--full">
                            <label htmlFor="pf-email">Email</label>
                            <div className="pf-input-lock">
                                <input
                                    id="pf-email"
                                    type="email"
                                    value={email}
                                    disabled
                                    readOnly
                                />
                                <FaLock />
                            </div>
                        </div>

                        <div className="pf-readonly">
                            <span>Department</span>
                            <strong>{department || "Not assigned"}</strong>
                        </div>

                        <div className="pf-readonly">
                            <span>Designation</span>
                            <strong>{designation || "Not assigned"}</strong>
                        </div>

                        <div className="pf-readonly pf-field--full">
                            <span>Reports To</span>
                            <strong>{reportsTo || "Not assigned"}</strong>
                        </div>
                    </div>

                    <p className="pf-hint">
                        Department, designation and reporting line are managed by your admin.
                    </p>
                </section>

                {/* ==================================================
                    PASSWORD
                ================================================== */}

                <section className="pf-card">
                    <header className="pf-card-head">
                        <span className="pf-card-icon pf-card-icon--amber"><FaShieldAlt /></span>
                        <div>
                            <h2>Change Password</h2>
                            <p>Change your own password securely. Your password is never stored in the browser.</p>
                        </div>
                    </header>

                    <div className="pf-fields pf-fields--single">
                        <div className="pf-field">
                            <label htmlFor="pf-cur">Current Password</label>
                            <input
                                id="pf-cur"
                                type="password"
                                placeholder="Enter current password"
                                value={currentPassword}
                                onChange={(e) =>
                                    setCurrentPassword(e.target.value)
                                }
                            />
                        </div>

                        <div className="pf-field">
                            <label htmlFor="pf-new">New Password</label>
                            <input
                                id="pf-new"
                                type="password"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) =>
                                    setNewPassword(e.target.value)
                                }
                            />
                            {newPassword && (
                                <div className={`pf-strength pf-strength--${passwordStrength.score}`}>
                                    <span className="pf-strength-bar"><i /></span>
                                    <small>{passwordStrength.label}</small>
                                </div>
                            )}
                        </div>

                        <div className="pf-field">
                            <label htmlFor="pf-confirm">Confirm Password</label>
                            <input
                                id="pf-confirm"
                                type="password"
                                placeholder="Confirm new password"
                                className={passwordsMismatch ? "is-invalid" : ""}
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                            />
                            {passwordsMismatch && (
                                <small className="pf-error-text">Passwords do not match.</small>
                            )}
                        </div>
                    </div>

                    <div className="pf-card-foot">
                        <button
                            type="button"
                            className="pp-btn pp-btn--primary"
                            onClick={handlePasswordReset}
                            disabled={passwordSaving}
                        >
                            <FaKey />
                            {passwordSaving
                                ? "Updating..."
                                : "Update Password"}
                        </button>
                    </div>
                </section>
            </div>

            {/* ==================================================
                ASSIGNED STORES
            ================================================== */}

            <section className="pf-card">
                <header className="pf-card-head pf-card-head--split">
                    <div className="pf-card-head-left">
                        <span className="pf-card-icon pf-card-icon--teal"><FaStore /></span>
                        <div>
                            <h2>Assigned Stores <span className="pf-count">{formatCount(stores.length)}</span></h2>
                            <p>Stores you can see and act on across every module.</p>
                        </div>
                    </div>

                    <div className="pf-search">
                        <FaSearch />
                        <input
                            type="text"
                            placeholder="Search store, city or state..."
                            value={storeSearch}
                            onChange={(e) =>
                                setStoreSearch(e.target.value)
                            }
                        />
                    </div>
                </header>

                {filteredStores.length ? (
                    <ul className="pf-store-grid">
                        {filteredStores.map((store) => (
                            <li key={store.id} className="pf-store">
                                <span className={`pp-avatar ${avatarTone(store.store_name)}`}>
                                    {initials(String(store.store_name || "").replace(/^MRPL\s*-\s*/i, ""))}
                                </span>
                                <span className="pf-store-text">
                                    <strong title={store.store_name}>
                                        {store.store_name || "Unnamed Store"}
                                    </strong>
                                    {(store.location || store.city || store.state) && (
                                        <small title={[store.location, store.city, store.state].filter(Boolean).join(", ")}>
                                            <FaMapMarkerAlt />
                                            {[store.city, store.state].filter(Boolean).join(", ") || store.location}
                                        </small>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="pf-empty">
                        <FaStore />
                        <strong>{storeSearch ? "No stores match your search" : "No stores assigned"}</strong>
                        <span>{storeSearch ? "Try another name, city or state." : "Ask your admin to assign stores to your account."}</span>
                    </div>
                )}
            </section>

            {/* ==================================================
                SAVE (sticky)
            ================================================== */}

            <div className="pf-savebar">
                <span>Changes to your name, employee ID and photo are saved together.</span>
                <button
                    type="button"
                    className="pp-btn pp-btn--primary"
                    onClick={handleSaveProfile}
                    disabled={saving}
                >
                    <FaSave />
                    {saving ? "Saving..." : "Save Profile"}
                </button>
            </div>
        </div>
    );
}

export default Profile;
