import { Navigate } from "react-router-dom";

function getUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
}

function getPermissions() {
    try {
        return JSON.parse(localStorage.getItem("permissions") || "{}");
    } catch {
        return {};
    }
}

function isAdministrator(user) {
    return (
        user?.administrator === true ||
        user?.administrator === 1 ||
        user?.administrator === "1" ||
        user?.is_admin === true ||
        user?.is_admin === 1 ||
        user?.is_admin === "1"
    );
}

function permissionLevel(value) {
    return { None: 0, View: 1, Add: 2, Edit: 3, Full: 4 }[value] || 0;
}

function ExpensePermissionRoute({ required = "View", children }) {
    const user = getUser();
    const permissions = getPermissions();

    if (isAdministrator(user)) return children;

    const current = permissions?.Expenses;
    if (permissionLevel(current) >= permissionLevel(required)) return children;

    return <Navigate to="/expenses/entry" replace />;
}

export default ExpensePermissionRoute;
