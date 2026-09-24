import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useRbacVersion } from "../../hooks/usePermission";
import { MODULE_BY_NAME } from "../../config/rbacCatalog";
import "../../styles/rbac.css";
import {
  findPageForPath,
  getModuleLevel,
  isAdministratorUser,
  levelRank,
} from "../../utils/rbac";

// =================================================================
// RBAC ACTION GUARD
// =================================================================
//
// Makes View / Add / Edit / Full behave the same on EVERY page,
// without having to hand-edit dozens of screens:
//
//   View → add / edit / delete buttons are hidden (read-only)
//   Add  → add buttons stay, edit / delete buttons are hidden
//   Edit → add + edit stay, delete / bulk-destructive are hidden
//   Full → nothing is hidden
//
// It looks at the buttons inside the page area only (never the
// sidebar or top bar) and classifies them by their label, title or
// aria-label ("Add User", "Edit", "Delete All", …).
//
// Page authors can be explicit when a label is ambiguous:
//   data-rbac-action="add" | "edit" | "delete"   → force a category
//   data-rbac="ignore"                           → never touch
//
// This is a UX layer. The server still checks every request with
// permissionMiddleware, so a hidden button can't be bypassed.
// =================================================================

const HIDDEN_CLASS = "rbac-locked";

const REQUIRED_RANK = { add: 2, edit: 3, delete: 4 };

const DELETE_RE =
  /^(delete|remove|clear all|delete all|bulk delete|purge|disable|deactivate|enable|activate|revoke|discard|trash)\b/;

const EDIT_RE =
  /^(edit|update|modify|approve|reject|decline|rename|reassign|re-assign|resend|mark as|mark complete|mark done|reopen|re-open|change status|set status|verify|settle|cancel advance|override)\b/;

const ADD_RE =
  /^(\+\s*)?(add|create|upload|bulk add|bulk upload|import|submit|save|assign|send|publish|raise|duplicate|clone|invite|attach|take photo)\b|^(\+\s*)?new(\s+\S+)?$/;

const CANDIDATE_SELECTOR = [
  "button",
  "[role='button']",
  "input[type='submit']",
  "input[type='button']",
  "a.btn",
  "a[class*='btn']",
  "a[class*='button']",
].join(",");

const normalizeLabel = (element) => {
  const text =
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    element.value ||
    element.textContent ||
    "";

  return text.replace(/\s+/g, " ").trim().toLowerCase();
};

const classify = (element, selfService) => {
  const explicit = element.getAttribute("data-rbac-action");
  if (explicit && REQUIRED_RANK[explicit]) return explicit;

  // Prefer the visible text; fall back to aria-label / title for
  // icon-only buttons.
  const visible = (element.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
  const label = visible || normalizeLabel(element);

  if (!label || label.length > 40) return null;

  if (DELETE_RE.test(label)) return "delete";
  if (EDIT_RE.test(label)) return "edit";
  if (!selfService && ADD_RE.test(label)) return "add";

  // Icon-only buttons usually carry the real meaning in title/aria.
  if (!visible) return null;

  const secondary = (
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    ""
  )
    .trim()
    .toLowerCase();

  if (secondary) {
    if (DELETE_RE.test(secondary)) return "delete";
    if (EDIT_RE.test(secondary)) return "edit";
    if (!selfService && ADD_RE.test(secondary)) return "add";
  }

  return null;
};

const clearAll = (root) => {
  root?.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((element) => {
    element.classList.remove(HIDDEN_CLASS);
    element.removeAttribute("aria-hidden");
  });
};

function RbacActionGuard({ containerSelector = ".page-content" }) {
  const location = useLocation();
  const version = useRbacVersion();

  useEffect(() => {
    const root = document.querySelector(containerSelector);
    if (!root) return undefined;

    const page = findPageForPath(location.pathname);
    const module = page ? MODULE_BY_NAME[page.module] : null;

    const rank =
      !page || isAdministratorUser() || module?.guardExempt
        ? 4
        : levelRank(getModuleLevel(page.module));

    root.setAttribute("data-rbac-level", String(rank));
    clearAll(root);

    if (rank >= 4) return undefined;

    const selfService = Boolean(page?.selfService);
    let frame = 0;

    const apply = () => {
      frame = 0;

      root.querySelectorAll(CANDIDATE_SELECTOR).forEach((element) => {
        if (element.closest("[data-rbac='ignore']")) return;

        const category = classify(element, selfService);
        const shouldHide = category ? rank < REQUIRED_RANK[category] : false;

        if (shouldHide) {
          if (!element.classList.contains(HIDDEN_CLASS)) {
            element.classList.add(HIDDEN_CLASS);
            element.setAttribute("aria-hidden", "true");
          }
        } else if (element.classList.contains(HIDDEN_CLASS)) {
          element.classList.remove(HIDDEN_CLASS);
          element.removeAttribute("aria-hidden");
        }
      });
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    apply();

    const observer = new MutationObserver(schedule);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      clearAll(root);
    };
  }, [location.pathname, version, containerSelector]);

  return null;
}

export default RbacActionGuard;
