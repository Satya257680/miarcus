import React, {
    useEffect,
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import axios from "axios";

import "../styles/Signup.css";


// ======================================================
// API
// ======================================================

const API =
    "https://miarcus-backend.onrender.com";


// ======================================================
// MODULES
// ======================================================

const modules = [

    "Dashboard",
    "Action Points",
    "Checklist Reports",
    "Checklist Submit",
    "Checklist Types",
    "Questions",
    "Departments",
    "Designations",
    "Store Management",
    "Users",
    "Reports To",
    "NSO Rules",
    "Profile",
    "Settings",

];


// ======================================================
// PERMISSIONS
// ======================================================

const permissionTypes = [

    "None",
    "View",
    "Add",
    "Edit",
    "Full",

];


// ======================================================
// SIGNUP
// ======================================================

function Signup() {

    const navigate =
        useNavigate();


    // ==================================================
    // PROFILE
    // ==================================================

    const [
        fullName,
        setFullName
    ] = useState("");

    const [
        employeeId,
        setEmployeeId
    ] = useState("");

    const [
        email,
        setEmail
    ] = useState("");

    const [
        confirmEmail,
        setConfirmEmail
    ] = useState("");

    const [
        callContact,
        setCallContact
    ] = useState("");

    const [
        whatsappContact,
        setWhatsappContact
    ] = useState("");

    const [
        confirmWhatsappContact,
        setConfirmWhatsappContact
    ] = useState("");


    // ==================================================
    // PASSWORD
    // ==================================================

    const [
        password,
        setPassword
    ] = useState("");

    const [
        confirmPassword,
        setConfirmPassword
    ] = useState("");


    // ==================================================
    // REPORTS
    // ==================================================

    const [
        reportsList,
        setReportsList
    ] = useState([]);

    const [
        reportSearch,
        setReportSearch
    ] = useState("");

    const [
        selectedReport,
        setSelectedReport
    ] = useState(null);

    const [
        showReportList,
        setShowReportList
    ] = useState(false);


    // ==================================================
    // DEPARTMENTS
    // ==================================================

    const [
        departments,
        setDepartments
    ] = useState([]);

    const [
        departmentId,
        setDepartmentId
    ] = useState("");


    // ==================================================
    // DESIGNATIONS
    // ==================================================

    const [
        designations,
        setDesignations
    ] = useState([]);

    const [
        designationId,
        setDesignationId
    ] = useState("");


    // ==================================================
    // STORES
    // ==================================================

    const [
        stores,
        setStores
    ] = useState([]);

    const [
        storeSearch,
        setStoreSearch
    ] = useState("");

    const [
        selectedStores,
        setSelectedStores
    ] = useState([]);


    // ==================================================
    // PERMISSIONS
    // ==================================================

    const [
        modulePermissions,
        setModulePermissions
    ] = useState(

        modules.reduce(
            (
                result,
                module
            ) => {

                result[module] =
                    "None";

                return result;

            },
            {}
        )

    );


    // ==================================================
    // ACCOUNT
    // ==================================================

    const [
        loading,
        setLoading
    ] = useState(false);


    // ==================================================
    // FILTER STORES
    // ==================================================

    const filteredStores =
        stores.filter(
            (store) =>

                store.store_name
                    ?.toLowerCase()
                    .includes(
                        storeSearch
                            .toLowerCase()
                    )

        );


    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(() => {

        loadReports();

        fetchDepartments();

        fetchDesignations();

        fetchStores();

    }, []);


    // ==================================================
    // LOAD REPORTS
    // ==================================================

    const loadReports =
        async () => {

            try {

                const response =
                    await axios.get(
                        `${API}/api/reports`
                    );

                setReportsList(

                    (
                        response.data
                            ?.reports ||
                        []
                    ).map(
                        (manager) => ({

                            id:
                                manager.id,

                            name:
                                manager.manager_name,

                            email:
                                manager.department,

                        })
                    )

                );

            }
            catch (error) {

                console.error(
                    "Reports loading failed:",
                    error
                );

            }

        };


    // ==================================================
    // LOAD DEPARTMENTS
    // ==================================================

    const fetchDepartments =
        async () => {

            try {

                const response =
                    await axios.get(
                        `${API}/api/departments`
                    );

                setDepartments(
                    response.data?.data ||
                    []
                );

            }
            catch (error) {

                console.error(
                    "Departments loading failed:",
                    error
                );

            }

        };


    // ==================================================
    // LOAD DESIGNATIONS
    // ==================================================

    const fetchDesignations =
        async () => {

            try {

                const response =
                    await axios.get(
                        `${API}/api/designations`
                    );

                setDesignations(
                    response.data?.data ||
                    []
                );

            }
            catch (error) {

                console.error(
                    "Designations loading failed:",
                    error
                );

            }

        };


    // ==================================================
    // LOAD STORES
    // ==================================================

    const fetchStores =
        async () => {

            try {

                const response =
                    await axios.get(
                        `${API}/api/stores`
                    );

                setStores(
                    response.data?.data ||
                    []
                );

            }
            catch (error) {

                console.error(
                    "Stores loading failed:",
                    error
                );

            }

        };


    // ==================================================
    // STORE TOGGLE
    // ==================================================

    const toggleStore =
        (storeId) => {

            setSelectedStores(
                (current) => {

                    if (
                        current.includes(
                            storeId
                        )
                    ) {

                        return current.filter(
                            (id) =>
                                id !==
                                storeId
                        );

                    }

                    return [
                        ...current,
                        storeId
                    ];

                }
            );

        };


    // ==================================================
    // TOGGLE ALL STORES
    // ==================================================

    const toggleAllStores =
        () => {

            if (
                stores.length > 0 &&
                selectedStores.length ===
                    stores.length
            ) {

                setSelectedStores([]);

                return;

            }

            setSelectedStores(
                stores.map(
                    (store) =>
                        store.id
                )
            );

        };


    // ==================================================
    // PERMISSION CHANGE
    // ==================================================

    const handlePermissionChange =
        (
            module,
            permission
        ) => {

            setModulePermissions(
                (current) => ({

                    ...current,

                    [module]:
                        permission,

                })
            );

        };


    // ==================================================
    // VALIDATION
    // ==================================================

    const validateForm =
        () => {

            if (
                !fullName.trim() ||
                !employeeId.trim() ||
                !email.trim() ||
                !confirmEmail.trim() ||
                !callContact.trim() ||
                !whatsappContact.trim() ||
                !confirmWhatsappContact.trim() ||
                !password ||
                !confirmPassword
            ) {

                alert(
                    "Please fill all required fields."
                );

                return false;

            }


            if (
                email.trim().toLowerCase() !==
                confirmEmail
                    .trim()
                    .toLowerCase()
            ) {

                alert(
                    "Email and Confirm Email do not match."
                );

                return false;

            }


            if (
                whatsappContact.trim() !==
                confirmWhatsappContact.trim()
            ) {

                alert(
                    "WhatsApp contacts do not match."
                );

                return false;

            }


            if (
                password.length < 6
            ) {

                alert(
                    "Password must contain at least 6 characters."
                );

                return false;

            }


            if (
                password !==
                confirmPassword
            ) {

                alert(
                    "Password and Confirm Password do not match."
                );

                return false;

            }


            if (
                callContact.trim().length < 10
            ) {

                alert(
                    "Please enter a valid Call Contact."
                );

                return false;

            }


            if (
                whatsappContact.trim().length < 10
            ) {

                alert(
                    "Please enter a valid WhatsApp Contact."
                );

                return false;

            }


            return true;

        };


    // ==================================================
    // SIGNUP
    // ==================================================

    const handleSignup =
        async () => {

            if (
                !validateForm()
            ) {

                return;

            }


            try {

                setLoading(true);


                // ------------------------------------------
                // PUBLIC SIGNUP PAYLOAD
                // ------------------------------------------

                const payload = {

                    fullName:
                        fullName.trim(),

                    employeeId:
                        employeeId.trim(),

                    email:
                        email
                            .trim()
                            .toLowerCase(),

                    password,

                    callContact:
                        callContact.trim(),

                    whatsappContact:
                        whatsappContact.trim(),

                    reportsTo:
                        selectedReport,

                    department_id:
                        departmentId ||
                        null,

                    designation_id:
                        designationId ||
                        null,

                    stores:
                        selectedStores,

                    permissions:
                        modulePermissions,

                    // --------------------------------------
                    // NORMAL SELF-REGISTERED USER
                    // --------------------------------------

                    active:
                        true,

                    administrator:
                        false,

                    // --------------------------------------
                    // EMAIL TEST MODE
                    // --------------------------------------

                    disableEmail:
                        true,

                };


                /*
                 * IMPORTANT:
                 *
                 * We are NOT using the protected
                 * Users page endpoint here.
                 *
                 * This endpoint will be added in
                 * the backend in the next step.
                 */

                const response =
                    await axios.post(

                        `${API}/api/auth/signup`,

                        payload

                    );


                if (
                    response.data?.success
                ) {

                    alert(
                        "Account created successfully. You can now login."
                    );

                    navigate("/");

                    return;

                }


                throw new Error(
                    response.data?.message ||
                    "Unable to create account."
                );

            }
            catch (error) {

                console.error(
                    "Signup failed:",
                    error
                );

                alert(

                    error.response
                        ?.data
                        ?.message ||

                    error.response
                        ?.data
                        ?.error ||

                    error.message ||

                    "Unable to create account."

                );

            }
            finally {

                setLoading(false);

            }

        };


    // ==================================================
    // JSX
    // ==================================================

    return (

        <div className="signup-page">

            <div className="signup-container">


                {/* ======================================
                    HEADER
                ====================================== */}

                <div className="signup-header">

                    <div className="signup-logo">
                        miarcus
                    </div>

                    <h1>
                        Create Your Account
                    </h1>

                    <p>
                        Complete the registration form
                        to create your miarcus account.
                    </p>

                </div>


                {/* ======================================
                    PROFILE
                ====================================== */}

                <section className="signup-card">

                    <div className="signup-section-title">

                        <div className="signup-section-icon">
                            🛡️
                        </div>

                        <div>

                            <h2>
                                Profile & Sign-in
                            </h2>

                            <p>
                                Enter your account information.
                            </p>

                        </div>

                    </div>


                    <div className="signup-divider" />


                    <div className="signup-grid">


                        {/* FULL NAME */}

                        <div className="signup-field full">

                            <label>
                                Full Name
                                <span>*</span>
                            </label>

                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) =>
                                    setFullName(
                                        e.target.value
                                    )
                                }
                                placeholder="e.g. Priya Sharma"
                            />

                        </div>


                        {/* EMPLOYEE ID */}

                        <div className="signup-field">

                            <label>
                                Employee ID
                                <span>*</span>
                            </label>

                            <input
                                type="text"
                                value={employeeId}
                                onChange={(e) =>
                                    setEmployeeId(
                                        e.target.value
                                    )
                                }
                                placeholder="e.g. EMP1023"
                            />

                        </div>


                        {/* EMAIL */}

                        <div className="signup-field">

                            <label>
                                Email
                                <span>*</span>
                            </label>

                            <input
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(
                                        e.target.value
                                    )
                                }
                                placeholder="name@company.com"
                            />

                        </div>


                        {/* CONFIRM EMAIL */}

                        <div className="signup-field full">

                            <label>
                                Confirm Email
                                <span>*</span>
                            </label>

                            <input
                                type="email"
                                value={confirmEmail}
                                onChange={(e) =>
                                    setConfirmEmail(
                                        e.target.value
                                    )
                                }
                                placeholder="Re-enter email address"
                            />

                        </div>


                        {/* CALL CONTACT */}

                        <div className="signup-field">

                            <label>
                                Call Contact
                                <span>*</span>
                            </label>

                            <input
                                type="text"
                                value={callContact}
                                onChange={(e) =>
                                    setCallContact(
                                        e.target.value
                                    )
                                }
                                maxLength={10}
                                placeholder="Enter Call Contact"
                            />

                        </div>


                        {/* WHATSAPP */}

                        <div className="signup-field">

                            <label>
                                WhatsApp Contact
                                <span>*</span>
                            </label>

                            <input
                                type="text"
                                value={whatsappContact}
                                onChange={(e) =>
                                    setWhatsappContact(
                                        e.target.value
                                    )
                                }
                                maxLength={10}
                                placeholder="Enter WhatsApp Contact"
                            />

                        </div>


                        {/* CONFIRM WHATSAPP */}

                        <div className="signup-field full">

                            <label>
                                Confirm WhatsApp Contact
                                <span>*</span>
                            </label>

                            <input
                                type="text"
                                value={
                                    confirmWhatsappContact
                                }
                                onChange={(e) =>
                                    setConfirmWhatsappContact(
                                        e.target.value
                                    )
                                }
                                maxLength={10}
                                placeholder="Re-enter WhatsApp Contact"
                            />

                        </div>


                        {/* PASSWORD */}

                        <div className="signup-field">

                            <label>
                                Password
                                <span>*</span>
                            </label>

                            <input
                                type="password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="Enter password"
                            />

                        </div>


                        {/* CONFIRM PASSWORD */}

                        <div className="signup-field">

                            <label>
                                Confirm Password
                                <span>*</span>
                            </label>

                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="Re-enter password"
                            />

                        </div>

                    </div>

                </section>


                {/* ======================================
                    REPORTS TO
                ====================================== */}

                <section className="signup-card">

                    <div className="signup-section-title">

                        <div className="signup-section-icon">
                            👥
                        </div>

                        <div>

                            <h2>
                                Reports To
                            </h2>

                            <p>
                                Choose a reporting manager.
                            </p>

                        </div>

                    </div>


                    <div className="signup-divider" />


                    <div className="signup-report-wrapper">

                        <input
                            type="text"
                            className="signup-select-input"
                            placeholder="Select manager..."
                            value={
                                selectedReport
                                    ? selectedReport.name
                                    : reportSearch
                            }
                            onChange={(e) => {

                                setReportSearch(
                                    e.target.value
                                );

                                setSelectedReport(
                                    null
                                );

                                setShowReportList(
                                    true
                                );

                            }}
                            onFocus={() =>
                                setShowReportList(
                                    true
                                )
                            }
                        />


                        {showReportList && (

                            <div className="signup-report-list">

                                {reportsList
                                    .filter(
                                        (manager) =>
                                            (
                                                manager.name ||
                                                ""
                                            )
                                                .toLowerCase()
                                                .includes(
                                                    reportSearch
                                                        .toLowerCase()
                                                )
                                    )
                                    .map(
                                        (manager) => (

                                            <button
                                                type="button"
                                                className="signup-report-item"
                                                key={
                                                    manager.id
                                                }
                                                onClick={() => {

                                                    setSelectedReport(
                                                        manager
                                                    );

                                                    setReportSearch(
                                                        manager.name
                                                    );

                                                    setShowReportList(
                                                        false
                                                    );

                                                }}
                                            >

                                                <strong>
                                                    {
                                                        manager.name
                                                    }
                                                </strong>

                                                <small>
                                                    {
                                                        manager.email
                                                    }
                                                </small>

                                            </button>

                                        )
                                    )}

                            </div>

                        )}

                    </div>

                </section>


                {/* ======================================
                    DEPARTMENT
                ====================================== */}

                <section className="signup-card">

                    <div className="signup-section-title">

                        <div className="signup-section-icon">
                            🏢
                        </div>

                        <div>

                            <h2>
                                Department
                            </h2>

                            <p>
                                Select a department.
                            </p>

                        </div>

                    </div>


                    <div className="signup-divider" />


                    <select
                        className="signup-select"
                        value={departmentId}
                        onChange={(e) => {

                            setDepartmentId(
                                e.target.value
                            );

                            setDesignationId("");

                        }}
                    >

                        <option value="">
                            Select Department
                        </option>

                        {departments.map(
                            (department) => (

                                <option
                                    key={
                                        department.id
                                    }
                                    value={
                                        department.id
                                    }
                                >
                                    {
                                        department.department_name
                                    }
                                </option>

                            )
                        )}

                    </select>

                </section>


                {/* ======================================
                    DESIGNATION
                ====================================== */}

                <section className="signup-card">

                    <div className="signup-section-title">

                        <div className="signup-section-icon">
                            💼
                        </div>

                        <div>

                            <h2>
                                Designation
                            </h2>

                            <p>
                                Select a designation.
                            </p>

                        </div>

                    </div>


                    <div className="signup-divider" />


                    <select
                        className="signup-select"
                        value={designationId}
                        onChange={(e) =>
                            setDesignationId(
                                e.target.value
                            )
                        }
                    >

                        <option value="">
                            Select Designation
                        </option>

                        {designations
                            .filter(
                                (designation) =>
                                    String(
                                        designation.department_id
                                    ) ===
                                    String(
                                        departmentId
                                    )
                            )
                            .map(
                                (designation) => (

                                    <option
                                        key={
                                            designation.id
                                        }
                                        value={
                                            designation.id
                                        }
                                    >
                                        {
                                            designation.designation_name
                                        }
                                    </option>

                                )
                            )}

                    </select>

                </section>


                {/* ======================================
                    STORES
                ====================================== */}

                <section className="signup-card">

                    <div className="signup-section-title">

                        <div className="signup-section-icon">
                            🏬
                        </div>

                        <div>

                            <h2>
                                Assigned Stores
                            </h2>

                            <p>
                                Assign one or more stores.
                            </p>

                        </div>

                    </div>


                    <div className="signup-divider" />


                    <input
                        type="text"
                        className="signup-store-search"
                        placeholder="Filter stores..."
                        value={storeSearch}
                        onChange={(e) =>
                            setStoreSearch(
                                e.target.value
                            )
                        }
                    />


                    <label className="signup-checkbox-row">

                        <input
                            type="checkbox"
                            checked={
                                stores.length > 0 &&
                                selectedStores.length ===
                                    stores.length
                            }
                            onChange={
                                toggleAllStores
                            }
                        />

                        Select All

                    </label>


                    <div className="signup-store-list">

                        {filteredStores.length > 0
                            ? filteredStores.map(
                                (store) => (

                                    <label
                                        key={
                                            store.id
                                        }
                                        className="signup-checkbox-row"
                                    >

                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedStores.includes(
                                                    store.id
                                                )
                                            }
                                            onChange={() =>
                                                toggleStore(
                                                    store.id
                                                )
                                            }
                                        />

                                        {
                                            store.store_name
                                        }

                                    </label>

                                )
                            )
                            : (

                                <div className="signup-empty">
                                    No Stores Found
                                </div>

                            )}

                    </div>

                </section>


                {/* ======================================
                    MODULE ACCESS
                ====================================== */}

                <section className="signup-card">

                    <div className="signup-section-title">

                        <div className="signup-section-icon">
                            🔐
                        </div>

                        <div>

                            <h2>
                                Module Access
                            </h2>

                            <p>
                                Choose permission level
                                for every module.
                            </p>

                        </div>

                    </div>


                    <div className="signup-divider" />


                    <div className="signup-permission-table">

                        <div className="signup-permission-head">

                            <div>
                                Module
                            </div>

                            {permissionTypes.map(
                                (type) => (

                                    <div
                                        key={type}
                                    >
                                        {type}
                                    </div>

                                )
                            )}

                        </div>


                        {modules.map(
                            (module) => (

                                <div
                                    className="signup-permission-row"
                                    key={module}
                                >

                                    <div>
                                        {module}
                                    </div>

                                    {permissionTypes.map(
                                        (type) => (

                                            <div
                                                key={
                                                    type
                                                }
                                            >

                                                <input
                                                    type="radio"
                                                    name={`permission-${module}`}
                                                    checked={
                                                        modulePermissions[
                                                            module
                                                        ] ===
                                                        type
                                                    }
                                                    onChange={() =>
                                                        handlePermissionChange(
                                                            module,
                                                            type
                                                        )
                                                    }
                                                />

                                            </div>

                                        )
                                    )}

                                </div>

                            )
                        )}

                    </div>

                </section>


                {/* ======================================
                    TEST MODE NOTICE
                ====================================== */}

                <div className="signup-test-notice">

                    <strong>
                        Testing Mode
                    </strong>

                    <p>
                        No activation or registration
                        email will be sent. After successful
                        registration, you can log in directly.
                    </p>

                </div>


                {/* ======================================
                    FOOTER
                ====================================== */}

                <div className="signup-footer">

                    <button
                        type="button"
                        className="signup-cancel-btn"
                        onClick={() =>
                            navigate("/")
                        }
                    >
                        Back to Login
                    </button>


                    <button
                        type="button"
                        className="signup-submit-btn"
                        onClick={handleSignup}
                        disabled={loading}
                    >

                        {loading
                            ? "Creating Account..."
                            : "Create Account"}

                    </button>

                </div>

            </div>

        </div>

    );

}


export default Signup;