// =================================================================
// MIARCUS — RBAC HELPERS
// =================================================================
//
// One place that answers "can this user see / do X?" for the whole
// frontend (sidebar, route guards, page buttons).
//
// Data lives in localStorage (written at login and refreshed from
// the server every time the app shell loads / regains focus):
//
//   user        → { administrator: true|false, ... }
//   permissions → { "Quiz": "View", "Expenses": "Edit", ... }
//   pageAccess  → { "quiz.setup": false, ... }   (missing = allowed)
//
// The server is always the final authority — these helpers only
// decide what to SHOW. Every API is still checked on the backend.
// =================================================================

import { matchPath } from "react-router-dom";
import axios, { API_BASE_URL } from "../axiosConfig.js";
import {
  LEVEL_RANK,
  MODULE_ALIASES,
  MODULE_BY_NAME,
  PAGES,
  PAGE_BY_KEY,
  RBAC_MODULES,
} from "../config/rbacCatalog";

export const RBAC_EVENT = "miarcus:rbac-updated";

// -----------------------------------------------------------------
// STORAGE
// -----------------------------------------------------------------

const readJson = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
};

export const getStoredUser = () => readJson("user");

export const getStoredPermissions = () => {
  const raw = readJson("permissions");
  const normalized = { ...raw };

  // Map legacy names onto the current module names.
  Object.entries(MODULE_ALIASES).forEach(([legacy, current]) => {
    if (raw[legacy] && !raw[current]) {
      normalized[current] = raw[legacy];
    }
  });

  return normalized;
};

export const getStoredPageAccess = () => readJson("pageAccess");

// -----------------------------------------------------------------
// ADMINISTRATOR
// -----------------------------------------------------------------

export const isAdministratorUser = (user = getStoredUser()) =>
  user?.administrator === true ||
  user?.administrator === 1 ||
  user?.administrator === "1" ||
  user?.is_admin === true ||
  user?.is_admin === 1 ||
  user?.is_admin === "1";

// -----------------------------------------------------------------
// LEVEL CHECKS
// -----------------------------------------------------------------

export const levelRank = (level) => LEVEL_RANK[level] ?? 0;

export const getModuleLevel = (moduleName, session = null) => {
  const user = session?.user ?? getStoredUser();

  if (isAdministratorUser(user)) {
    return "Full";
  }

  const permissions = session?.permissions ?? getStoredPermissions();
  const level = permissions?.[moduleName];

  return LEVEL_RANK[level] !== undefined ? level : "None";
};

export const hasModuleLevel = (moduleName, required = "View", session = null) =>
  levelRank(getModuleLevel(moduleName, session)) >= levelRank(required);

// Page-level check:
//   • module level must be ≥ max(View, page.min)
//   • the page must not be switched off in pageAccess
//   • admin-only modules require an administrator
export const canAccessPage = (pageKey, session = null) => {
  const page = PAGE_BY_KEY[pageKey];
  if (!page) return false;

  const user = session?.user ?? getStoredUser();
  if (isAdministratorUser(user)) return true;

  const module = MODULE_BY_NAME[page.module];
  if (module?.adminOnly) return false;

  const required = page.min || "View";
  if (!hasModuleLevel(page.module, required, session)) return false;

  const pageAccess = session?.pageAccess ?? getStoredPageAccess();
  return pageAccess?.[pageKey] !== false;
};

// A module is visible when at least one of its pages is reachable.
export const canAccessModule = (moduleName, session = null) => {
  const module = MODULE_BY_NAME[moduleName];

  if (!module) {
    return hasModuleLevel(moduleName, "View", session);
  }

  return module.pages.some((page) => canAccessPage(page.key, session));
};

// -----------------------------------------------------------------
// ROUTE ↔ PAGE LOOKUP
// -----------------------------------------------------------------

// Longer / more specific paths first so "/collection-tracking/insight"
// wins over "/collection-tracking".
const PATH_INDEX = PAGES.flatMap((page) =>
  page.paths.map((path) => ({ path, page }))
).sort((a, b) => b.path.length - a.path.length);

export const findPageForPath = (pathname) => {
  for (const entry of PATH_INDEX) {
    if (matchPath({ path: entry.path, end: true }, pathname)) {
      return entry.page;
    }
  }

  return null;
};

// First page this user is allowed to open (used after login and
// when the Dashboard itself is not granted).
export const getFirstAllowedPath = (session = null) => {
  for (const module of RBAC_MODULES) {
    for (const page of module.pages) {
      if (canAccessPage(page.key, session)) {
        return page.paths.find((path) => !path.includes(":")) || page.paths[0];
      }
    }
  }

  return "/profile";
};

// -----------------------------------------------------------------
// SESSION SNAPSHOT (handy for components)
// -----------------------------------------------------------------

export const getRbacSession = () => ({
  user: getStoredUser(),
  permissions: getStoredPermissions(),
  pageAccess: getStoredPageAccess(),
});

// -----------------------------------------------------------------
// LIVE REFRESH FROM THE SERVER
// -----------------------------------------------------------------
//
// Permissions used to be read ONLY at login, so when an admin
// changed someone's access nothing happened until that person
// logged out and in again. The app shell now re-reads them from
// GET /api/users/me/access on load, on tab focus and every few
// minutes, and broadcasts RBAC_EVENT so the sidebar and guards
// re-render immediately.
// -----------------------------------------------------------------

let inflight = null;

export const refreshAccess = async () => {
  if (!localStorage.getItem("token")) return null;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users/me/access`, {
        timeout: 15000,
      });

      const data = response?.data;
      if (!data?.success) return null;

      const before = JSON.stringify(getRbacSession());

      const user = getStoredUser();
      localStorage.setItem(
        "user",
        JSON.stringify({ ...user, administrator: Boolean(data.administrator) })
      );
      localStorage.setItem("permissions", JSON.stringify(data.permissions || {}));
      localStorage.setItem("pageAccess", JSON.stringify(data.pageAccess || {}));

      const after = JSON.stringify(getRbacSession());

      if (before !== after) {
        window.dispatchEvent(new CustomEvent(RBAC_EVENT));
      }

      return data;
    } catch {
      // Offline / older backend — keep what we have.
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};

export const saveLoginAccess = (responseData = {}) => {
  localStorage.setItem("permissions", JSON.stringify(responseData.permissions || {}));
  localStorage.setItem("pageAccess", JSON.stringify(responseData.pageAccess || {}));
  window.dispatchEvent(new CustomEvent(RBAC_EVENT));
};
