import { Navigate } from "react-router-dom";

// ======================================================
// MODULE PERMISSION ROUTE
// ======================================================
//
// Protects frontend routes using:
// - Login state
// - Administrator status
// - Module permission
// - Required permission level
//
// Permission hierarchy:
//
// None  = 0
// View  = 1
// Add   = 2
// Edit  = 3
// Full  = 4
//
// Administrator always has access.
// ======================================================

const ModulePermissionRoute = ({
    moduleName,
    children,
    adminOnly = false,
    requiredPermission = null,
}) => {

    // ==================================================
    // LOGIN CHECK
    // ==================================================

    const userId =
        localStorage.getItem("userId");

    if (!userId) {
        return (
            <Navigate
                to="/"
                replace
            />
        );
    }

    // ==================================================
    // LOAD USER
    // ==================================================

    let user = {};

    try {
        user = JSON.parse(
            localStorage.getItem("user") ||
            "{}"
        );
    } catch {
        user = {};
    }

    // ==================================================
    // LOAD PERMISSIONS
    // ==================================================

    let permissions = {};

    try {
        permissions = JSON.parse(
            localStorage.getItem("permissions") ||
            "{}"
        );
    } catch {
        permissions = {};
    }

    // ==================================================
    // ADMINISTRATOR DETECTION
    // ==================================================

    const isAdministrator =
        user?.administrator === true ||
        user?.administrator === 1 ||
        user?.administrator === "1" ||
        user?.is_admin === true ||
        user?.is_admin === 1 ||
        user?.is_admin === "1";

    // ==================================================
    // PERMISSION RANK
    // ==================================================

    const permissionRank = {
        None: 0,
        View: 1,
        Add: 2,
        Edit: 3,
        Full: 4,
    };

    // ==================================================
    // CURRENT MODULE PERMISSION
    // ==================================================

    const currentPermission =
        permissions?.[moduleName] ||
        "None";

    // ==================================================
    // REQUIRED PERMISSION CHECK
    // ==================================================

    const currentRank =
        permissionRank[
            currentPermission
        ] ?? 0;

    const requiredRank =
        requiredPermission
            ? (
                permissionRank[
                    requiredPermission
                ] ?? 0
            )
            : 1;

    const allowed =
        currentRank >= requiredRank;

    // ==================================================
    // ADMIN-ONLY ROUTE
    // ==================================================

    if (
        adminOnly &&
        !isAdministrator
    ) {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );
    }

    // ==================================================
    // ADMINISTRATOR BYPASS
    // ==================================================
    //
    // Administrator has unrestricted module access.
    // ==================================================

    if (isAdministrator) {
        return children;
    }

    // ==================================================
    // PERMISSION DENIED
    // ==================================================

    if (!allowed) {
        return (
            <Navigate
                to="/dashboard"
                replace
            />
        );
    }

    // ==================================================
    // ACCESS GRANTED
    // ==================================================

    return children;
};

export default ModulePermissionRoute;