import { Navigate, useLocation } from "react-router-dom";

import AccessDenied from "./AccessDenied";
import { useRbacVersion } from "../../hooks/usePermission";
import {
  canAccessModule,
  canAccessPage,
  getFirstAllowedPath,
  hasModuleLevel,
  isAdministratorUser,
} from "../../utils/rbac";

// ======================================================
// MODULE PERMISSION ROUTE
// ======================================================
//
// <ModulePermissionRoute page="quiz.setup">          ← preferred
// <ModulePermissionRoute moduleName="Chat">          ← module-level
// <ModulePermissionRoute moduleName="Attendance" requiredPermission="Full">
// <ModulePermissionRoute adminOnly>
//
// • Administrator always passes.
// • `page`      → module level ≥ page minimum AND page switched on.
// • `moduleName`→ module level ≥ requiredPermission (default View).
// • Denied      → premium "No access" screen instead of a silent
//                 redirect (the old redirect to /dashboard looped
//                 forever when Dashboard itself was not granted).
// • When the Dashboard is not granted, the user is sent to the
//   first page they DO have access to.
// ======================================================

const ModulePermissionRoute = ({
  moduleName,
  page,
  children,
  adminOnly = false,
  requiredPermission = null,
}) => {
  useRbacVersion();
  const location = useLocation();

  if (!localStorage.getItem("userId")) {
    return <Navigate to="/login" replace />;
  }

  if (isAdministratorUser()) {
    return children;
  }

  let allowed = true;

  if (adminOnly) {
    allowed = false;
  } else if (page) {
    allowed = canAccessPage(page);
  } else if (moduleName) {
    allowed = requiredPermission
      ? hasModuleLevel(moduleName, requiredPermission)
      : canAccessModule(moduleName);
  }

  if (allowed) {
    return children;
  }

  // Dashboard not granted → go straight to something useful.
  if (page === "dashboard.home" || location.pathname === "/dashboard") {
    const fallback = getFirstAllowedPath();

    if (fallback && fallback !== location.pathname) {
      return <Navigate to={fallback} replace />;
    }
  }

  return <AccessDenied />;
};

export default ModulePermissionRoute;
