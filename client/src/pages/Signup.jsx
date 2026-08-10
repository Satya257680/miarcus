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
// WIZARD STEPS
// ======================================================

const steps = [

    {
        key: "profile",
        label: "Profile",
        icon: "🛡️",
    },
    {
        key: "reporting",
        label: "Reporting",
        icon: "👥",
    },
    {
        key: "stores",
        label: "Stores",
        icon: "🏬",
    },
    {
        key: "access",
        label: "Access",
        icon: "🔐",
    },
    {
        key: "review",
        label: "Review",
        icon: "✅",
    },

];


// ======================================================
// SIGNUP
// ======================================================

function Signup() {

    const navigate =
        useNavigate();


    // ==================================================
    // WIZARD
    // ==================================================

    const [
        currentStep,
        setCurrentStep
    ] = useState(0);


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
    // DERIVED / SUMMARY HELPERS
    // ==================================================

    const selectedDepartment =
        departments.find(
            (department) =>
                String(department.id) ===
                String(departmentId)
        );

    const selectedDesignation =
        designations.find(
            (designation) =>
                String(designation.id) ===
                String(designationId)
        );

    const grantedModuleCount =
        Object.values(
            modulePermissions
        ).filter(
            (value) => value !== "None"
        ).length;

    const progressPercent =
        Math.round(
            (
                (currentStep + 1) /
                steps.length
            ) * 100
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
    // STEP VALIDATION
    // ==================================================

    const validateProfileStep =
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


    const validateCurrentStep =
        () => {

            if (
                steps[currentStep].key ===
                "profile"
            ) {

                return validateProfileStep();

            }

            return true;

        };


    // ==================================================
    // STEP NAVIGATION
    // ==================================================

    const goNext =
        () => {

            if (
                !validateCurrentStep()
            ) {

                return;

            }

            setCurrentStep(
                (current) =>
                    Math.min(
                        current + 1,
                        steps.length - 1
                    )
            );

        };


    const goBack =
        () => {

            if (
                currentStep === 0
            ) {

                navigate("/");

                return;

            }

            setCurrentStep(
                (current) =>
                    Math.max(
                        current - 1,
                        0
                    )
            );

        };


    const goToStep =
        (index) => {

            if (
                index <= currentStep
            ) {

                setCurrentStep(index);

            }

        };


    // ==================================================
    // SIGNUP
    // ==================================================

    const handleSignup =
        async () => {

            if (
                !validateProfileStep()
            ) {

                setCurrentStep(0);

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
    // STEP CONTENT RENDERERS
    // ==================================================

    const renderProfileStep =
        () => (

            <section className="wizard-panel">

                <div className="wizard-panel-title">

                    <div className="wizard-panel-icon">
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


                <div className="wizard-divider" />


                <div className="wizard-grid">


                    {/* FULL NAME */}

                    <div className="wizard-field full">

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

                    <div className="wizard-field">

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

                    <div className="wizard-field">

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

                    <div className="wizard-field full">

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

                    <div className="wizard-field">

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

                    <div className="wizard-field">

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

                    <div className="wizard-field full">

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

                    <div className="wizard-field">

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

                    <div className="wizard-field">

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

        );


    const renderReportingStep =
        () => (

            <>

                {/* ======================================
                    REPORTS TO
                ====================================== */}

                <section className="wizard-panel">

                    <div className="wizard-panel-title">

                        <div className="wizard-panel-icon">
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


                    <div className="wizard-divider" />


                    <div className="wizard-report-wrapper">

                        <input
                            type="text"
                            className="wizard-select-input"
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

                            <div className="wizard-report-list">

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
                                                className="wizard-report-item"
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

                <section className="wizard-panel">

                    <div className="wizard-panel-title">

                        <div className="wizard-panel-icon">
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


                    <div className="wizard-divider" />


                    <select
                        className="wizard-select"
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

                <section className="wizard-panel">

                    <div className="wizard-panel-title">

                        <div className="wizard-panel-icon">
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


                    <div className="wizard-divider" />


                    <select
                        className="wizard-select"
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

            </>

        );


    const renderStoresStep =
        () => (

            <section className="wizard-panel">

                <div className="wizard-panel-title">

                    <div className="wizard-panel-icon">
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


                <div className="wizard-divider" />


                <input
                    type="text"
                    className="wizard-store-search"
                    placeholder="Filter stores..."
                    value={storeSearch}
                    onChange={(e) =>
                        setStoreSearch(
                            e.target.value
                        )
                    }
                />


                <label className="wizard-checkbox-row">

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


                <div className="wizard-store-list">

                    {filteredStores.length > 0
                        ? filteredStores.map(
                            (store) => (

                                <label
                                    key={
                                        store.id
                                    }
                                    className="wizard-checkbox-row"
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

                            <div className="wizard-empty">
                                No Stores Found
                            </div>

                        )}

                </div>

            </section>

        );


    const renderAccessStep =
        () => (

            <section className="wizard-panel">

                <div className="wizard-panel-title">

                    <div className="wizard-panel-icon">
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


                <div className="wizard-divider" />


                <div className="wizard-permission-table">

                    <div className="wizard-permission-head">

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
                                className="wizard-permission-row"
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

        );


    const renderReviewStep =
        () => (

            <section className="wizard-panel">

                <div className="wizard-panel-title">

                    <div className="wizard-panel-icon">
                        ✅
                    </div>

                    <div>

                        <h2>
                            Review & Submit
                        </h2>

                        <p>
                            Confirm your details before
                            creating your account.
                        </p>

                    </div>

                </div>


                <div className="wizard-divider" />


                <div className="wizard-review-grid">

                    <div className="wizard-review-item">
                        <span>Full Name</span>
                        <strong>
                            {fullName || "--"}
                        </strong>
                    </div>

                    <div className="wizard-review-item">
                        <span>Employee ID</span>
                        <strong>
                            {employeeId || "--"}
                        </strong>
                    </div>

                    <div className="wizard-review-item">
                        <span>Email</span>
                        <strong>
                            {email || "--"}
                        </strong>
                    </div>

                    <div className="wizard-review-item">
                        <span>Call Contact</span>
                        <strong>
                            {callContact || "--"}
                        </strong>
                    </div>

                    <div className="wizard-review-item">
                        <span>WhatsApp Contact</span>
                        <strong>
                            {whatsappContact || "--"}
                        </strong>
                    </div>

                    <div className="wizard-review-item">
                        <span>Reports To</span>
                        <strong>
                            {selectedReport?.name || "--"}
                        </strong>
                    </div>

                    <div className="wizard-review-item">
                        <span>Department</span>
                        <strong>
                            {
                                selectedDepartment?.department_name ||
                                "--"
                            }
                        </strong>
                    </div>

                    <div className="wizard-review-item">
                        <span>Designation</span>
                        <strong>
                            {
                                selectedDesignation?.designation_name ||
                                "--"
                            }
                        </strong>
                    </div>

                    <div className="wizard-review-item">
                        <span>Stores Assigned</span>
                        <strong>
                            {selectedStores.length}
                        </strong>
                    </div>

                    <div className="wizard-review-item">
                        <span>Modules Granted</span>
                        <strong>
                            {grantedModuleCount} / {modules.length}
                        </strong>
                    </div>

                </div>


                <div className="wizard-test-notice">

                    <strong>
                        Testing Mode
                    </strong>

                    <p>
                        No activation or registration
                        email will be sent. After successful
                        registration, you can log in directly.
                    </p>

                </div>

            </section>

        );


    const stepRenderers = [

        renderProfileStep,
        renderReportingStep,
        renderStoresStep,
        renderAccessStep,
        renderReviewStep,

    ];


    const isLastStep =
        currentStep ===
        steps.length - 1;


    // ==================================================
    // JSX
    // ==================================================

    return (

        <div className="signup-page">

            <div className="signup-container">


                {/* ======================================
                    HEADER
                ====================================== */}

                <div className="wizard-header">

                    <div className="wizard-header-left">

                        <div className="wizard-header-icon">
                            🛡️
                        </div>

                        <div>

                            <h1>
                                Create Your Account
                            </h1>

                            <p>
                                Complete the registration form
                                to create your miarcus account.
                            </p>

                        </div>

                    </div>


                    <button
                        type="button"
                        className="wizard-header-close"
                        onClick={() =>
                            navigate("/")
                        }
                        aria-label="Back to login"
                    >
                        ✕
                    </button>

                </div>


                {/* ======================================
                    STEP INDICATOR
                ====================================== */}

                <div className="wizard-steps">

                    {steps.map(
                        (step, index) => (

                            <React.Fragment
                                key={step.key}
                            >

                                <button
                                    type="button"
                                    className={
                                        "wizard-step" +
                                        (index === currentStep
                                            ? " active"
                                            : "") +
                                        (index < currentStep
                                            ? " done"
                                            : "")
                                    }
                                    onClick={() =>
                                        goToStep(index)
                                    }
                                >

                                    <span className="wizard-step-circle">

                                        {index < currentStep
                                            ? "✓"
                                            : step.icon}

                                    </span>

                                    <span className="wizard-step-text">

                                        <small>
                                            Step {index + 1}
                                        </small>

                                        <strong>
                                            {step.label}
                                        </strong>

                                    </span>

                                </button>


                                {index < steps.length - 1 && (

                                    <span
                                        className={
                                            "wizard-step-line" +
                                            (index < currentStep
                                                ? " done"
                                                : "")
                                        }
                                    />

                                )}

                            </React.Fragment>

                        )
                    )}

                </div>


                {/* ======================================
                    BODY
                ====================================== */}

                <div className="wizard-body">


                    {/* MAIN COLUMN */}

                    <div className="wizard-main">

                        {stepRenderers[currentStep]()}

                    </div>


                    {/* SUMMARY SIDEBAR */}

                    <aside className="wizard-summary">

                        <div className="wizard-summary-head">

                            <div className="wizard-summary-icon">
                                🛡️
                            </div>

                            <h3>
                                Registration Summary
                            </h3>

                            <span className="wizard-summary-badge">
                                In Progress
                            </span>

                        </div>


                        <div className="wizard-summary-progress-label">

                            <span>
                                Form Completion
                            </span>

                            <span>
                                {progressPercent}%
                            </span>

                        </div>


                        <div className="wizard-progress-track">

                            <div
                                className="wizard-progress-fill"
                                style={{
                                    width: `${progressPercent}%`,
                                }}
                            />

                        </div>


                        <div className="wizard-summary-list">

                            <div className="wizard-summary-item">

                                <span className="wizard-summary-item-icon">
                                    👤
                                </span>

                                <div>

                                    <small>
                                        Full Name
                                    </small>

                                    <strong>
                                        {fullName || "--"}
                                    </strong>

                                </div>

                            </div>


                            <div className="wizard-summary-item">

                                <span className="wizard-summary-item-icon">
                                    📧
                                </span>

                                <div>

                                    <small>
                                        Email
                                    </small>

                                    <strong>
                                        {email || "--"}
                                    </strong>

                                </div>

                            </div>


                            <div className="wizard-summary-item">

                                <span className="wizard-summary-item-icon">
                                    🏢
                                </span>

                                <div>

                                    <small>
                                        Department
                                    </small>

                                    <strong>
                                        {
                                            selectedDepartment?.department_name ||
                                            "--"
                                        }
                                    </strong>

                                </div>

                            </div>


                            <div className="wizard-summary-item">

                                <span className="wizard-summary-item-icon">
                                    🏬
                                </span>

                                <div>

                                    <small>
                                        Stores Assigned
                                    </small>

                                    <strong>
                                        {selectedStores.length}
                                    </strong>

                                </div>

                            </div>

                        </div>


                        <div className="wizard-summary-footer">

                            ✅ Step {currentStep + 1} of {steps.length}

                        </div>

                    </aside>

                </div>


                {/* ======================================
                    FOOTER
                ====================================== */}

                <div className="wizard-footer">

                    <button
                        type="button"
                        className="wizard-cancel-btn"
                        onClick={goBack}
                    >

                        {currentStep === 0
                            ? "✕ Cancel"
                            : "← Back"}

                    </button>


                    {isLastStep ? (

                        <button
                            type="button"
                            className="wizard-submit-btn"
                            onClick={handleSignup}
                            disabled={loading}
                        >

                            {loading
                                ? "Creating Account..."
                                : "Create Account"}

                        </button>

                    ) : (

                        <button
                            type="button"
                            className="wizard-next-btn"
                            onClick={goNext}
                        >

                            Next →

                        </button>

                    )}

                </div>

            </div>

        </div>

    );

}


export default Signup;