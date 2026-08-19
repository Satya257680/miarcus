import { Navigate } from "react-router-dom";

const ModulePermissionRoute = ({ moduleName, children, adminOnly = false }) => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
        return <Navigate to="/" replace />;
    }

    let user = {};
    let permissions = {};

    try {
        user = JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        user = {};
    }

    try {
        permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
    } catch {
        permissions = {};
    }

    const isAdministrator =
        user?.administrator === true ||
        user?.administrator === 1 ||
        user?.administrator === "1" ||
        user?.is_admin === true ||
        user?.is_admin === 1 ||
        user?.is_admin === "1";

    const allowed = ["View", "Add", "Edit", "Full"].includes(
        permissions?.[moduleName]
    );

    if (adminOnly && !isAdministrator) {
        return <Navigate to="/dashboard" replace />;
    }

    if (!isAdministrator && !allowed) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ModulePermissionRoute;
