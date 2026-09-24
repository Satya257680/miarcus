// =================================================================
// MIARCUS — RBAC CATALOGUE (single source of truth)
// =================================================================
//
// Every module that can be granted to a user, grouped the same way
// the sidebar is grouped, together with the PAGES (sub-modules)
// that live inside it.
//
// Used by:
//   • AddUserModal / PermissionMatrix  — to build the access screen
//   • Sidebar                          — to show / hide menu items
//   • ModulePermissionRoute            — to guard direct URLs
//   • RbacActionGuard                  — to enforce View / Add / Edit
//
// MODULE LEVELS
//   None = nothing visible (hidden from sidebar, URL blocked)
//   View = every page visible, read-only (no add / edit / delete)
//   Add  = View + create new records
//   Edit = View + Add + modify existing records
//   Full = everything, including delete / approve / bulk actions
//
// PAGES
//   Each page can be switched on / off individually with a checkbox.
//   A page with `min` needs at least that module level to open
//   (e.g. "Expense Entry" needs Add, "Approve Expenses" needs Edit).
//   `selfService` pages (Attendance, Take Quiz) let every user with
//   access do their OWN action (check in, answer a quiz) — only
//   edit / delete buttons are restricted there.
//
// IMPORTANT: module `name` values must match the server's
// RBAC_MODULES list (server/models/userModel.js) exactly.
// =================================================================

export const LEVELS = ["None", "View", "Add", "Edit", "Full"];

export const LEVEL_RANK = {
  None: 0,
  View: 1,
  Add: 2,
  Edit: 3,
  Full: 4,
};

export const LEVEL_META = {
  None: {
    label: "None",
    short: "No access",
    description: "Hidden from the sidebar and every page is blocked.",
  },
  View: {
    label: "View",
    short: "Read only",
    description: "Can open every page and see data, but cannot change anything.",
  },
  Add: {
    label: "Add",
    short: "View + Add",
    description: "Can see everything and create new records.",
  },
  Edit: {
    label: "Edit",
    short: "View + Add + Edit",
    description: "Can see, create and modify existing records.",
  },
  Full: {
    label: "Full",
    short: "Full control",
    description: "Complete control, including delete, approvals and bulk actions.",
  },
};

// -----------------------------------------------------------------
// GROUPS → MODULES → PAGES
// -----------------------------------------------------------------

export const RBAC_GROUPS = [
  {
    id: "overview",
    label: "Overview",
    description: "Home, communication and company updates",
    modules: [
      {
        name: "Dashboard",
        icon: "dashboard",
        description: "KPIs, store performance and analytics",
        pages: [
          { key: "dashboard.home", label: "Dashboard", paths: ["/dashboard"] },
          { key: "dashboard.analytics", label: "Analytics", paths: ["/dashboard-analytics"] },
        ],
      },
      {
        name: "Activity Center",
        icon: "activity",
        description: "Tasks, follow-ups and activity timeline",
        pages: [
          {
            key: "activity.center",
            label: "Activity Center",
            paths: ["/activity-center", "/activity-center/:id"],
          },
        ],
      },
      {
        name: "Announcements",
        icon: "announcements",
        description: "Company news and circulars",
        pages: [{ key: "announcements.list", label: "Announcements", paths: ["/announcements"] }],
      },
      {
        name: "Gallery",
        icon: "gallery",
        description: "Store photos and media library",
        pages: [{ key: "gallery.library", label: "Gallery", paths: ["/gallery"] }],
      },
      {
        name: "Chat",
        icon: "chat",
        // Chat enforces its own View / Add / Edit / Full rules inside
        // the chat UI and API, so the generic action guard skips it.
        guardExempt: true,
        description: "Team chat and calling",
        pages: [{ key: "chat.messages", label: "Chat", paths: ["/chat"] }],
      },
    ],
  },

  {
    id: "operations",
    label: "Store Operations",
    description: "Daily store execution and compliance",
    modules: [
      {
        name: "Checklist Submission",
        icon: "checklistSubmit",
        description: "Fill and submit store checklists",
        pages: [{ key: "checklist.submit", label: "Checklist Submit", paths: ["/checklist-submit"] }],
      },
      {
        name: "Checklist Reports",
        icon: "checklistReports",
        description: "Submitted checklist reports and scores",
        pages: [{ key: "checklist.reports", label: "Checklist Reports", paths: ["/checklist-reports"] }],
      },
      {
        name: "Action Points",
        icon: "actionPoints",
        description: "Corrective actions raised from audits",
        pages: [{ key: "actionpoints.list", label: "Action Points", paths: ["/action-points"] }],
      },
      {
        name: "Attendance",
        icon: "attendance",
        description: "Daily attendance and reports",
        pages: [
          { key: "attendance.mark", label: "Attendance", paths: ["/attendance"], selfService: true },
          {
            key: "attendance.reports",
            label: "Attendance Reports",
            paths: ["/attendance-reports"],
            min: "Full",
          },
        ],
      },
      {
        name: "Asset Master",
        icon: "assets",
        description: "Marketing and legal asset library",
        pages: [
          { key: "assets.marketing", label: "Marketing Assets", paths: ["/asset-management"] },
          { key: "assets.legal", label: "Legal Assets", paths: ["/legal-assets"] },
        ],
      },
      {
        name: "Employee Location",
        icon: "location",
        description: "Live employee location tracking",
        adminOnly: true,
        pages: [
          { key: "location.live", label: "Employee Location", paths: ["/employee-location"] },
        ],
      },
    ],
  },

  {
    id: "nso",
    label: "New Store Opening",
    description: "Store launch projects and rules",
    modules: [
      {
        name: "New Store Openings",
        icon: "store",
        description: "NSO projects and tracking",
        pages: [
          { key: "nso.openings", label: "New Store Openings", paths: ["/new-store-openings"] },
          { key: "nso.tracking", label: "NSO Tracking", paths: ["/nso-tracking"] },
        ],
      },
      {
        name: "NSO Rules",
        icon: "rules",
        description: "Timeline rules for new stores",
        pages: [{ key: "nso.rules", label: "NSO Rules", paths: ["/nso-rules"] }],
      },
    ],
  },

  {
    id: "finance",
    label: "Finance",
    description: "Expenses, cash, billing and collections",
    modules: [
      {
        name: "Expenses",
        icon: "expenses",
        description: "Expense claims and approvals",
        pages: [
          {
            key: "expenses.entry",
            label: "Expense Entry",
            paths: ["/expenses/entry", "/expense-entry"],
            min: "Add",
          },
          {
            key: "expenses.track",
            label: "Track Expenses",
            paths: ["/expenses/track", "/track-expenses"],
          },
          {
            key: "expenses.approve",
            label: "Approve Expenses",
            paths: ["/expenses/approve", "/approve-expenses"],
            min: "Edit",
          },
        ],
      },
      {
        name: "Petty Cash",
        icon: "pettyCash",
        description: "Petty cash advances and settlements",
        pages: [
          {
            key: "pettycash.dashboard",
            label: "Petty Cash Dashboard",
            paths: ["/petty-cash", "/petty-cash/:id"],
          },
          {
            key: "pettycash.email",
            label: "Email Notifications",
            paths: ["/petty-cash/email-settings"],
          },
        ],
      },
      {
        name: "Billing",
        icon: "billing",
        description: "Bills, entries and daily billing",
        pages: [
          { key: "billing.entry", label: "Billing Entry", paths: ["/billing/entry"], min: "Add" },
          { key: "billing.bills", label: "Bills", paths: ["/billing/bills", "/billing/bills/:id"] },
          { key: "billing.daily", label: "Daily Report", paths: ["/billing/daily-report"] },
        ],
      },
      {
        name: "Daily Collection",
        icon: "collection",
        description: "Daily cash collection entries and reports",
        maxLevel: "Edit",
        pages: [
          { key: "dailycollection.entry", label: "Daily Entry", paths: ["/daily-collection"] },
          {
            key: "dailycollection.data",
            label: "Daily Data Report",
            paths: ["/daily-collection/report"],
          },
          {
            key: "dailycollection.reports",
            label: "Collection Reports",
            paths: ["/daily-collection/reports"],
          },
        ],
      },
    ],
  },

  {
    id: "training",
    label: "Training",
    description: "Quizzes and learning reports",
    modules: [
      {
        name: "Quiz",
        icon: "quiz",
        description: "Staff quizzes and training",
        pages: [
          { key: "quiz.take", label: "Take Quiz", paths: ["/quiz/take"], selfService: true },
          { key: "quiz.setup", label: "Quiz Setup", paths: ["/quiz/setup"] },
          { key: "quiz.report", label: "Training Report", paths: ["/quiz/report"] },
          { key: "quiz.email", label: "Email Setting", paths: ["/quiz/email"] },
        ],
      },
    ],
  },

  {
    id: "sales",
    label: "Sales Team",
    description: "Field visits, travel and reviews",
    modules: [
      {
        name: "Visit Planner",
        icon: "visit",
        description: "Plan store and market visits",
        pages: [{ key: "sales.visit", label: "Visit Planner", paths: ["/visit-planner"] }],
      },
      {
        name: "Travel Plan",
        icon: "travel",
        description: "Travel requests",
        pages: [{ key: "sales.travel", label: "Travel Plan", paths: ["/travel-plan"] }],
      },
      {
        name: "Travel Plan Approvals",
        icon: "approvals",
        description: "Approve team travel plans",
        pages: [
          { key: "sales.approvals", label: "Travel Plan Approvals", paths: ["/travel-plan-approval"] },
        ],
      },
      {
        name: "Sales Review",
        icon: "review",
        description: "Sales performance reviews",
        pages: [{ key: "sales.review", label: "Sales Review", paths: ["/sales-review"] }],
      },
    ],
  },

  {
    id: "inventory",
    label: "Merchandising & Inventory",
    description: "Listings, planning and collections",
    modules: [
      {
        name: "Listing Tracker",
        icon: "listing",
        description: "Marketplace listing status",
        pages: [{ key: "listing.tracker", label: "Listing Tracker", paths: ["/listing-tracker"] }],
      },
      {
        name: "Inventory Planning",
        icon: "inventory",
        description: "ERP data and replenishment planning",
        pages: [
          {
            key: "inventory.erp",
            label: "ERP Data Upload",
            paths: ["/inventory-planning/erp-upload"],
          },
          { key: "inventory.planning", label: "Inventory Planning", paths: ["/inventory-planning"] },
        ],
      },
      {
        name: "Collection Tracking",
        icon: "tags",
        description: "Product collections and SKU lifecycle",
        pages: [
          {
            key: "collection.add",
            label: "Add Products",
            paths: ["/collection-tracking/add-products"],
          },
          {
            key: "collection.sku",
            label: "SKU Details",
            paths: ["/collection-tracking", "/collection-tracking/sku-details/:id"],
          },
          { key: "collection.insight", label: "Insight", paths: ["/collection-tracking/insight"] },
          { key: "collection.requests", label: "Requests", paths: ["/collection-tracking/requests"] },
          {
            key: "collection.permissions",
            label: "Collection Permissions",
            paths: ["/collection-tracking/permissions"],
          },
          {
            key: "collection.master",
            label: "Master Data",
            paths: ["/collection-tracking/master-data"],
          },
        ],
      },
    ],
  },

  {
    id: "administration",
    label: "Administration",
    description: "Settings, people and master data",
    modules: [
      {
        name: "Users",
        icon: "users",
        description: "User accounts and access",
        pages: [{ key: "settings.users", label: "Users", paths: ["/settings/users", "/users"] }],
      },
      {
        name: "Departments",
        icon: "departments",
        description: "Department master",
        pages: [
          {
            key: "settings.departments",
            label: "Departments",
            paths: ["/settings/departments", "/departments"],
          },
        ],
      },
      {
        name: "Designations",
        icon: "designations",
        description: "Designation master",
        pages: [
          {
            key: "settings.designations",
            label: "Designations",
            paths: ["/settings/designations", "/designations"],
          },
        ],
      },
      {
        name: "Store Management",
        icon: "stores",
        description: "Store master and assignments",
        pages: [
          {
            key: "settings.stores",
            label: "Store Management",
            paths: ["/settings/stores", "/stores"],
          },
        ],
      },
      {
        name: "Questions",
        icon: "questions",
        description: "Checklist question bank",
        pages: [
          {
            key: "settings.questions",
            label: "Questions",
            paths: ["/settings/questions", "/questions"],
          },
        ],
      },
      {
        name: "Checklist Types",
        icon: "checklistTypes",
        description: "Checklist templates",
        pages: [
          {
            key: "settings.checklisttypes",
            label: "Checklist Types",
            paths: ["/settings/checklist-types", "/checklist-types"],
          },
        ],
      },
      {
        name: "Reports To",
        icon: "hierarchy",
        description: "Reporting hierarchy",
        pages: [
          {
            key: "settings.hierarchy",
            label: "Hierarchy",
            paths: ["/settings/hierarchy", "/settings/reports-to", "/reports-to"],
          },
        ],
      },
    ],
  },
];

// -----------------------------------------------------------------
// Modules the server keeps but that are personal areas — every
// signed-in user always has them (Profile, Settings → Appearance).
// They are not shown in the access matrix but are still sent so the
// server's user_permissions rows stay complete.
// -----------------------------------------------------------------

export const ALWAYS_ON_MODULES = ["Profile", "Settings"];

// -----------------------------------------------------------------
// FLAT LOOKUPS
// -----------------------------------------------------------------

export const RBAC_MODULES = RBAC_GROUPS.flatMap((group) =>
  group.modules.map((module) => ({ ...module, groupId: group.id, groupLabel: group.label }))
);

export const MODULE_NAMES = RBAC_MODULES.map((module) => module.name);

export const ALL_MODULE_NAMES = [...MODULE_NAMES, ...ALWAYS_ON_MODULES];

export const MODULE_BY_NAME = RBAC_MODULES.reduce((acc, module) => {
  acc[module.name] = module;
  return acc;
}, {});

export const PAGES = RBAC_MODULES.flatMap((module) =>
  module.pages.map((page) => ({ ...page, module: module.name }))
);

export const PAGE_BY_KEY = PAGES.reduce((acc, page) => {
  acc[page.key] = page;
  return acc;
}, {});

export const ALL_PAGE_KEYS = PAGES.map((page) => page.key);

// Clamp a level to what a module supports (e.g. Daily Collection
// tops out at Edit — Full is intentionally not available there).
export const clampLevel = (moduleName, level) => {
  const module = MODULE_BY_NAME[moduleName];
  const safe = LEVEL_RANK[level] !== undefined ? level : "None";

  if (module?.maxLevel && LEVEL_RANK[safe] > LEVEL_RANK[module.maxLevel]) {
    return module.maxLevel;
  }

  return safe;
};

// Legacy module names that may still exist in older data.
export const MODULE_ALIASES = {
  Expense: "Expenses",
  "Checklist Submit": "Checklist Submission",
  Stores: "Store Management",
  Hierarchy: "Reports To",
};
