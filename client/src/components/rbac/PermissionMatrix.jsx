import { useMemo, useState } from "react";
import {
  LuActivity,
  LuBadgeCheck,
  LuBan,
  LuBanknote,
  LuBuilding2,
  LuCalendarCheck,
  LuCheck,
  LuChevronDown,
  LuChevronsUpDown,
  LuCircleHelp,
  LuClipboardCheck,
  LuClipboardList,
  LuCrown,
  LuEye,
  LuFileCheck,
  LuGraduationCap,
  LuHandCoins,
  LuIdCard,
  LuImages,
  LuInfo,
  LuLayers,
  LuLayoutDashboard,
  LuListChecks,
  LuListTodo,
  LuLock,
  LuMap,
  LuMapPinned,
  LuMegaphone,
  LuMessagesSquare,
  LuNetwork,
  LuPackageSearch,
  LuPencil,
  LuPlane,
  LuPlus,
  LuReceipt,
  LuRotateCcw,
  LuScale,
  LuSearch,
  LuShieldCheck,
  LuSparkles,
  LuStore,
  LuTags,
  LuTrendingUp,
  LuUsers,
  LuWallet,
  LuWarehouse,
  LuX,
} from "react-icons/lu";

import {
  LEVELS,
  LEVEL_META,
  LEVEL_RANK,
  MODULE_NAMES,
  PAGES,
  RBAC_GROUPS,
  clampLevel,
} from "../../config/rbacCatalog";

import "../../styles/PermissionMatrix.css";

// =================================================================
// PERMISSION MATRIX
// =================================================================
//
// Module level  : None / View / Add / Edit / Full (segmented control)
// Pages         : checkbox per page inside the module
// Administrator : everything Full, nothing to click
//
// Controlled component — the parent (AddUserModal) owns:
//   permissions : { [moduleName]: level }
//   pageAccess  : { [pageKey]: boolean }   (missing = on)
// =================================================================

const MODULE_ICONS = {
  dashboard: LuLayoutDashboard,
  activity: LuActivity,
  announcements: LuMegaphone,
  gallery: LuImages,
  chat: LuMessagesSquare,
  checklistSubmit: LuClipboardCheck,
  checklistReports: LuClipboardList,
  actionPoints: LuListTodo,
  attendance: LuCalendarCheck,
  assets: LuScale,
  location: LuMapPinned,
  store: LuStore,
  rules: LuFileCheck,
  expenses: LuWallet,
  pettyCash: LuHandCoins,
  billing: LuReceipt,
  collection: LuBanknote,
  quiz: LuGraduationCap,
  visit: LuMap,
  travel: LuPlane,
  approvals: LuBadgeCheck,
  review: LuTrendingUp,
  listing: LuListChecks,
  inventory: LuPackageSearch,
  tags: LuTags,
  users: LuUsers,
  departments: LuBuilding2,
  designations: LuIdCard,
  stores: LuWarehouse,
  questions: LuCircleHelp,
  checklistTypes: LuLayers,
  hierarchy: LuNetwork,
};

const LEVEL_ICONS = {
  None: LuBan,
  View: LuEye,
  Add: LuPlus,
  Edit: LuPencil,
  Full: LuCrown,
};

const PRESETS = [
  { id: "None", label: "Clear all", icon: LuRotateCcw },
  { id: "View", label: "View all", icon: LuEye },
  { id: "Add", label: "Add all", icon: LuPlus },
  { id: "Edit", label: "Edit all", icon: LuPencil },
  { id: "Full", label: "Full all", icon: LuCrown },
];

const pageEnabled = (pageAccess, key) => pageAccess?.[key] !== false;

const pageReachable = (level, page) =>
  LEVEL_RANK[level] >= LEVEL_RANK[page.min || "View"];

function PermissionMatrix({
  permissions,
  pageAccess,
  isAdmin,
  onPermissionsChange,
  onPageAccessChange,
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const query = search.trim().toLowerCase();

  // ---------------------------------------------------------------
  // STATS
  // ---------------------------------------------------------------

  const stats = useMemo(() => {
    const counts = { None: 0, View: 0, Add: 0, Edit: 0, Full: 0 };
    let pagesOn = 0;

    MODULE_NAMES.forEach((name) => {
      const level = isAdmin ? "Full" : permissions?.[name] || "None";
      counts[level] = (counts[level] || 0) + 1;
    });

    PAGES.forEach((page) => {
      const level = isAdmin ? "Full" : permissions?.[page.module] || "None";

      if (
        isAdmin ||
        (level !== "None" &&
          pageReachable(level, page) &&
          pageEnabled(pageAccess, page.key))
      ) {
        pagesOn += 1;
      }
    });

    return {
      counts,
      granted: MODULE_NAMES.length - counts.None,
      pagesOn,
      pagesTotal: PAGES.length,
    };
  }, [permissions, pageAccess, isAdmin]);

  // ---------------------------------------------------------------
  // FILTERED GROUPS
  // ---------------------------------------------------------------

  const groups = useMemo(() => {
    if (!query) return RBAC_GROUPS;

    return RBAC_GROUPS.map((group) => ({
      ...group,
      modules: group.modules.filter(
        (module) =>
          module.name.toLowerCase().includes(query) ||
          module.description?.toLowerCase().includes(query) ||
          group.label.toLowerCase().includes(query) ||
          module.pages.some((page) => page.label.toLowerCase().includes(query))
      ),
    })).filter((group) => group.modules.length > 0);
  }, [query]);

  // ---------------------------------------------------------------
  // MUTATIONS
  // ---------------------------------------------------------------

  const setModuleLevel = (module, level) => {
    if (isAdmin || module.adminOnly) return;

    const nextLevel = clampLevel(module.name, level);
    const previous = permissions?.[module.name] || "None";

    onPermissionsChange({ ...permissions, [module.name]: nextLevel });

    // Granting a module that had every page switched off → switch
    // them back on so "View" really means "see everything".
    if (previous === "None" && nextLevel !== "None") {
      const allOff = module.pages.every((page) => !pageEnabled(pageAccess, page.key));

      if (allOff) {
        const next = { ...pageAccess };
        module.pages.forEach((page) => {
          delete next[page.key];
        });
        onPageAccessChange(next);
      }
    }
  };

  const setManyLevels = (modules, level) => {
    if (isAdmin) return;

    const next = { ...permissions };
    const nextPages = { ...pageAccess };

    modules.forEach((module) => {
      if (module.adminOnly) return;
      next[module.name] = clampLevel(module.name, level);

      if (level !== "None") {
        module.pages.forEach((page) => {
          delete nextPages[page.key];
        });
      }
    });

    onPermissionsChange(next);
    onPageAccessChange(nextPages);
  };

  const togglePage = (module, page) => {
    if (isAdmin || module.adminOnly) return;

    const level = permissions?.[module.name] || "None";
    const currentlyOn = level !== "None" && pageEnabled(pageAccess, page.key);

    // Ticking a page on a module with no access grants the
    // minimum level that page needs.
    if (!currentlyOn && !pageReachable(level, page)) {
      const needed = page.min || "View";
      const nextLevel =
        LEVEL_RANK[level] >= LEVEL_RANK[needed] ? level : clampLevel(module.name, needed);

      // Brand-new grant → only this page on, others off.
      const nextPages = { ...pageAccess };

      if (level === "None") {
        module.pages.forEach((item) => {
          nextPages[item.key] = item.key === page.key;
        });
      } else {
        nextPages[page.key] = true;
      }

      onPermissionsChange({ ...permissions, [module.name]: nextLevel });
      onPageAccessChange(nextPages);
      return;
    }

    const nextPages = { ...pageAccess, [page.key]: !currentlyOn };
    onPageAccessChange(nextPages);
  };

  const setAllPages = (module, on) => {
    if (isAdmin || module.adminOnly) return;

    const level = permissions?.[module.name] || "None";
    const nextPages = { ...pageAccess };

    module.pages.forEach((page) => {
      if (on) delete nextPages[page.key];
      else nextPages[page.key] = false;
    });

    if (on && level === "None") {
      onPermissionsChange({ ...permissions, [module.name]: "View" });
    }

    onPageAccessChange(nextPages);
  };

  const toggleExpanded = (name) =>
    setExpanded((previous) => ({ ...previous, [name]: !previous[name] }));

  const expandAll = (open) => {
    const next = {};
    RBAC_GROUPS.forEach((group) =>
      group.modules.forEach((module) => {
        next[module.name] = open;
      })
    );
    setExpanded(next);
  };

  // ---------------------------------------------------------------
  // RENDER HELPERS
  // ---------------------------------------------------------------

  const renderLevelControl = (module, level) => {
    const locked = isAdmin || module.adminOnly;

    return (
      <div
        className={`pm-levels ${locked ? "is-locked" : ""}`}
        role="radiogroup"
        aria-label={`${module.name} access level`}
      >
        {LEVELS.map((item) => {
          const Icon = LEVEL_ICONS[item];
          const unavailable =
            module.maxLevel && LEVEL_RANK[item] > LEVEL_RANK[module.maxLevel];
          const active = level === item;

          return (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={active}
              className={`pm-level pm-level-${item.toLowerCase()} ${active ? "is-active" : ""}`}
              disabled={locked || unavailable}
              title={
                unavailable
                  ? `${item} is not available for ${module.name}`
                  : `${LEVEL_META[item].label} — ${LEVEL_META[item].description}`
              }
              onClick={() => setModuleLevel(module, item)}
            >
              <Icon />
              <span>{item}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderPages = (module, level) => {
    const onCount = module.pages.filter(
      (page) =>
        isAdmin ||
        (level !== "None" && pageReachable(level, page) && pageEnabled(pageAccess, page.key))
    ).length;

    return (
      <div className="pm-pages">
        <div className="pm-pages-head">
          <span>
            <LuLayers />
            Pages in {module.name}
            <em>
              {onCount}/{module.pages.length} enabled
            </em>
          </span>

          {!isAdmin && !module.adminOnly && module.pages.length > 1 && (
            <div className="pm-pages-bulk">
              <button type="button" onClick={() => setAllPages(module, true)}>
                Select all
              </button>
              <button type="button" onClick={() => setAllPages(module, false)}>
                Clear
              </button>
            </div>
          )}
        </div>

        <div className="pm-page-grid">
          {module.pages.map((page) => {
            const reachable = isAdmin || pageReachable(level, page);
            const checked =
              isAdmin ||
              (level !== "None" && reachable && pageEnabled(pageAccess, page.key));
            const needsHigher = !isAdmin && level !== "None" && !reachable;

            return (
              <label
                key={page.key}
                className={`pm-page ${checked ? "is-on" : ""} ${
                  needsHigher ? "is-blocked" : ""
                } ${isAdmin || module.adminOnly ? "is-locked" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isAdmin || module.adminOnly}
                  onChange={() => togglePage(module, page)}
                />

                <span className="pm-checkbox" aria-hidden="true">
                  <LuCheck />
                </span>

                <span className="pm-page-text">
                  <strong>{page.label}</strong>
                  <small>{page.paths[0]}</small>
                </span>

                {page.min && (
                  <span
                    className={`pm-page-min pm-level-${page.min.toLowerCase()}`}
                    title={`Needs at least ${page.min} access`}
                  >
                    {page.min}+
                  </span>
                )}

                {page.selfService && (
                  <span className="pm-page-self" title="Users can always do their own entries here">
                    Self-service
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {module.pages.some((page) => page.min) && !isAdmin && (
          <p className="pm-pages-note">
            <LuInfo />
            Pages marked “Add+”, “Edit+” or “Full+” open only when the module
            level is at least that high. Ticking one raises the level
            automatically.
          </p>
        )}
      </div>
    );
  };

  const renderModule = (module) => {
    const level = isAdmin ? "Full" : permissions?.[module.name] || "None";
    const Icon = MODULE_ICONS[module.icon] || LuLayers;
    const open = Boolean(expanded[module.name]) || Boolean(query);

    const onCount = module.pages.filter(
      (page) =>
        isAdmin ||
        (level !== "None" && pageReachable(level, page) && pageEnabled(pageAccess, page.key))
    ).length;

    const partial = !isAdmin && level !== "None" && onCount < module.pages.length;
    const noPages = !isAdmin && level !== "None" && onCount === 0;

    return (
      <div
        key={module.name}
        className={`pm-module pm-tone-${level.toLowerCase()} ${open ? "is-open" : ""}`}
      >
        <div className="pm-module-row">
          <button
            type="button"
            className="pm-module-main"
            onClick={() => toggleExpanded(module.name)}
            aria-expanded={open}
          >
            <span className="pm-module-icon">
              <Icon />
            </span>

            <span className="pm-module-text">
              <strong>
                {module.name}
                {module.adminOnly && (
                  <span className="pm-badge pm-badge-admin">
                    <LuLock /> Admin only
                  </span>
                )}
              </strong>
              <small>{module.description}</small>
            </span>

            <span
              className={`pm-pages-pill ${partial ? "is-partial" : ""} ${
                noPages ? "is-empty" : ""
              }`}
              title="Pages enabled inside this module"
            >
              {level === "None" && !isAdmin
                ? `${module.pages.length} page${module.pages.length > 1 ? "s" : ""}`
                : `${onCount}/${module.pages.length} pages`}
            </span>

            <LuChevronDown className="pm-chevron" />
          </button>

          {renderLevelControl(module, level)}
        </div>

        {noPages && (
          <div className="pm-module-warning">
            <LuInfo />
            No pages selected — this module will stay hidden for the user.
          </div>
        )}

        {open && renderPages(module, level)}
      </div>
    );
  };

  // ---------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------

  return (
    <div className={`pm-root ${isAdmin ? "is-admin" : ""}`}>
      {/* ---------- LEGEND ---------- */}
      <div className="pm-legend">
        {LEVELS.map((level) => {
          const Icon = LEVEL_ICONS[level];

          return (
            <div key={level} className={`pm-legend-item pm-level-${level.toLowerCase()}`}>
              <span className="pm-legend-icon">
                <Icon />
              </span>
              <div>
                <strong>
                  {level}
                  <em>{stats.counts[level] || 0}</em>
                </strong>
                <small>{LEVEL_META[level].description}</small>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------- ADMIN HERO ---------- */}
      {isAdmin && (
        <div className="pm-admin-hero">
          <div className="pm-admin-hero-icon">
            <LuShieldCheck />
          </div>
          <div>
            <strong>
              Administrator — full access to everything
              <LuSparkles />
            </strong>
            <p>
              All {MODULE_NAMES.length} modules and {PAGES.length} pages are
              granted with Full control automatically. Nothing else needs to
              be selected. Turn Administrator off above to choose access
              module by module.
            </p>
          </div>
        </div>
      )}

      {/* ---------- TOOLBAR ---------- */}
      <div className="pm-toolbar">
        <div className="pm-search">
          <LuSearch />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search modules or pages…"
            aria-label="Search modules or pages"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              <LuX />
            </button>
          )}
        </div>

        <div className="pm-stats">
          <span>
            <strong>{isAdmin ? MODULE_NAMES.length : stats.granted}</strong>/
            {MODULE_NAMES.length} modules
          </span>
          <span>
            <strong>{stats.pagesOn}</strong>/{stats.pagesTotal} pages
          </span>
        </div>

        {!isAdmin && (
          <div className="pm-presets" aria-label="Quick presets">
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`pm-preset pm-level-${preset.id.toLowerCase()}`}
                  onClick={() =>
                    setManyLevels(
                      RBAC_GROUPS.flatMap((group) => group.modules),
                      preset.id
                    )
                  }
                >
                  <Icon />
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          className="pm-expand-all"
          onClick={() => {
            const anyOpen = Object.values(expanded).some(Boolean);
            expandAll(!anyOpen);
          }}
        >
          <LuChevronsUpDown />
          {Object.values(expanded).some(Boolean) ? "Collapse pages" : "Show all pages"}
        </button>
      </div>

      {/* ---------- GROUPS ---------- */}
      <div className="pm-groups">
        {groups.length === 0 && (
          <div className="pm-empty">
            <LuSearch />
            No module or page matches “{search}”.
          </div>
        )}

        {groups.map((group) => {
          const collapsed = Boolean(collapsedGroups[group.id]) && !query;
          const grantedInGroup = group.modules.filter(
            (module) => isAdmin || (permissions?.[module.name] || "None") !== "None"
          ).length;

          return (
            <section key={group.id} className={`pm-group ${collapsed ? "is-collapsed" : ""}`}>
              <header className="pm-group-head">
                <button
                  type="button"
                  className="pm-group-title"
                  onClick={() =>
                    setCollapsedGroups((previous) => ({
                      ...previous,
                      [group.id]: !previous[group.id],
                    }))
                  }
                  aria-expanded={!collapsed}
                >
                  <LuChevronDown className="pm-chevron" />
                  <span>
                    <strong>{group.label}</strong>
                    <small>{group.description}</small>
                  </span>
                  <em className="pm-group-count">
                    {grantedInGroup}/{group.modules.length}
                  </em>
                </button>

                {!isAdmin && (
                  <div className="pm-group-set">
                    <span>Set group</span>
                    {LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`pm-mini pm-level-${level.toLowerCase()}`}
                        onClick={() => setManyLevels(group.modules, level)}
                        title={`Set every module in ${group.label} to ${level}`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                )}
              </header>

              {!collapsed && <div className="pm-module-list">{group.modules.map(renderModule)}</div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default PermissionMatrix;
