// =================================================================
// usePermission / useRbacVersion
// =================================================================
//
// const { level, canView, canAdd, canEdit, canFull, isAdmin } =
//   usePermission("Quiz");
//
// {canAdd && <button>Add Question</button>}
//
// Re-renders automatically when the admin changes this user's
// access (see utils/rbac.js → refreshAccess).
// =================================================================

import { useEffect, useState } from "react";
import {
  RBAC_EVENT,
  canAccessPage,
  getModuleLevel,
  isAdministratorUser,
  levelRank,
} from "../utils/rbac";

export const useRbacVersion = () => {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((value) => value + 1);

    window.addEventListener(RBAC_EVENT, bump);
    window.addEventListener("storage", bump);

    return () => {
      window.removeEventListener(RBAC_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  return version;
};

export default function usePermission(moduleName) {
  useRbacVersion();

  const level = getModuleLevel(moduleName);
  const rank = levelRank(level);

  return {
    level,
    isAdmin: isAdministratorUser(),
    canView: rank >= 1,
    canAdd: rank >= 2,
    canEdit: rank >= 3,
    canFull: rank >= 4,
    canDelete: rank >= 4,
    canPage: (pageKey) => canAccessPage(pageKey),
  };
}
