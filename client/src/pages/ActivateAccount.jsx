import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
    FaLock,
    FaEye,
    FaEyeSlash,
    FaCheckCircle,
} from "react-icons/fa";

import "../styles/ActivateAccount.css";

function ActivateAccount() {

    const { token } = useParams();

    const navigate = useNavigate();

    const [password, setPassword] = useState("");

    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);

    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(true);

    const [submitting, setSubmitting] = useState(false);

    const [validToken, setValidToken] = useState(false);

    const [activated, setActivated] = useState(false);

    useEffect(() => {

        validateToken();

    }, []);

    // ===============================
    // Validate Token
    // ===============================

    const validateToken = async () => {

        try {

            await axios.get(
                `http://localhost:5000/api/users/activate/${token}`
            );

            setValidToken(true);

        }

        catch {

            setValidToken(false);

        }

        finally {

            setLoading(false);

        }

    };

    // ===============================
    // Activate Account
    // ===============================

    const activateAccount = async () => {

        if (!password || !confirmPassword) {

            return alert("Please fill all fields.");

        }

        if (password.length < 8) {

            return alert("Password must be at least 8 characters.");

        }

        if (password !== confirmPassword) {

            return alert("Passwords do not match.");

        }

        try {

            setSubmitting(true);

            await axios.post(

                "http://localhost:5000/api/users/activate",

                {

                    token,

                    password,

                }

            );

            setActivated(true);

            setTimeout(() => {

                navigate("/");

            }, 2500);

        }

        catch (err) {

            alert(

                err.response?.data?.message ||

                "Activation Failed"

            );

        }

        finally {

            setSubmitting(false);

        }

    };

    // ===============================
    // Password Strength
    // ===============================

    const getPasswordStrength = () => {

        if (!password) return "";

        if (password.length < 8) return "Weak Password";

        if (password.length < 12) return "Medium Password";

        return "Strong Password";

    };

    // ===============================
    // Success Screen
    // ===============================

    if (activated) {

        return (

            <div className="activate-page">

                <div className="activate-card">

                    <FaCheckCircle className="success-icon" />

                    <h2>Account Activated!</h2>

                    <p className="subtitle">

                        Your account has been activated successfully.

                        <br />

                        Redirecting to Login...

                    </p>

                </div>

            </div>

        );

    }

    // ===============================
    // Loading
    // ===============================

    if (loading) {

        return (

            <div className="activate-page">

                <div className="activate-card">

                    <img
                        src="/miarcus.png"
                        alt="MIARCUS"
                        className="activate-logo"
                    />

                    <h2>Checking Invitation...</h2>

                    <p className="subtitle">

                        Please wait while we verify your invitation.

                    </p>

                </div>

            </div>

        );

    }

    // ===============================
    // Invalid Link
    // ===============================

    if (!validToken) {

        return (

            <div className="activate-page">

                <div className="activate-card">

                    <img
                        src="/miarcus.png"
                        alt="MIARCUS"
                        className="activate-logo"
                    />

                    <h2>Invalid Invitation</h2>

                    <p className="subtitle">

                        This activation link is invalid,

                        expired, or has already been used.

                    </p>

                    <button

                        onClick={() => navigate("/")}

                    >

                        Back to Login

                    </button>

                </div>

            </div>

        );

    }

    // ===============================
    // Main UI
    // ===============================

    return (

        <div className="activate-page">

            <div className="activate-card">

                <img
                    src="/miarcus.png"
                    alt="MIARCUS"
                    className="activate-logo"
                />

                <h2>Activate Your Account</h2>

                <p className="subtitle">

                    Welcome to <strong>MIARCUS ERP</strong>.

                    <br />

                    Create a secure password to activate your account.

                </p>

                {/* Password */}

                <div className="password-group">

                    <FaLock className="lock-icon" />

                    <input

                        type={showPassword ? "text" : "password"}

                        placeholder="Create Password"

                        value={password}

                        onChange={(e) =>

                            setPassword(e.target.value)

                        }

                    />

                    <span

                        className="eye-icon"

                        onClick={() =>

                            setShowPassword(!showPassword)

                        }

                    >

                        {

                            showPassword

                                ?

                                <FaEyeSlash />

                                :

                                <FaEye />

                        }

                    </span>

                </div>

                <p className="password-strength">

                    {getPasswordStrength()}

                </p>

                {/* Confirm Password */}

                <div className="password-group">

                    <FaLock className="lock-icon" />

                    <input

                        type={

                            showConfirmPassword

                                ?

                                "text"

                                :

                                "password"

                        }

                        placeholder="Confirm Password"

                        value={confirmPassword}

                        onChange={(e) =>

                            setConfirmPassword(

                                e.target.value

                            )

                        }

                    />

                    <span

                        className="eye-icon"

                        onClick={() =>

                            setShowConfirmPassword(

                                !showConfirmPassword

                            )

                        }

                    >

                        {

                            showConfirmPassword

                                ?

                                <FaEyeSlash />

                                :

                                <FaEye />

                        }

                    </span>

                </div>

                <button

                    onClick={activateAccount}

                    disabled={submitting}

                >

                    {

                        submitting

                            ?

                            "Activating..."

                            :

                            "Activate Account"

                    }

                </button>

                <p className="activate-footer">

                    Already activated?

                    <span

                        onClick={() => navigate("/")}

                    >

                        Back to Login

                    </span>

                </p>

            </div>

        </div>

    );

}

export default ActivateAccount;