/**
 * Zarvis project knowledge layer.
 *
 * This is intentionally a safe product-level index, not a source-code dump.
 * Zarvis can use it to answer questions about the modules, screens, routes and
 * workflows that exist in the current Miarcus application.
 */

const PROJECT_SNAPSHOT = {
    frontendRoutes: 85,
    pageSourceFiles: 73,
    backendRouteFiles: 38,
    controllers: 34,
    models: 36,
};

const OVERVIEW = `Miarcus is an internal management platform with a protected employee application and a public Help Center. The current project contains a dashboard, announcements, gallery and asset management, attendance and attendance reports, employee location, team chat, action points, checklist submission and reports, new-store-opening workflows, expenses and petty cash, billing and daily collection, sales-team planning and review, listing tracking, inventory planning, collection tracking, quizzes and training reports, user/department/designation/store administration, profile and settings, notifications, and a 24×7 Help Center with Zarvis and human support.`;

const MODULES = [
    {
        name: "Dashboard",
        aliases: ["dashboard", "home", "analytics", "summary", "overview"],
        audience: "employee",
        summary: "The dashboard is the main authenticated landing area and provides operational views and analytics for the modules the user can access.",
        features: ["Dashboard", "Dashboard Analytics"],
        routes: ["/dashboard", "/dashboard-analytics"],
    },
    {
        name: "Action Points",
        aliases: ["action point", "action points", "task", "follow up", "followup", "next action", "history"],
        audience: "employee",
        summary: "Action Points is used to record, track and follow up on issues or tasks raised from operational checks. Action-point records support workflow status, priority, department, store, checklist context and history.",
        features: ["Create and edit action points", "Track status and priority", "Filter by store, department, NSO project, status, priority and checklist type", "Export and bulk upload", "Review action history"],
        routes: ["/action-points"],
    },
    {
        name: "Checklist",
        aliases: ["checklist", "inspection", "check list", "checklist report", "checklist submit", "checklist submission"],
        audience: "employee",
        summary: "Checklist workflows cover submitting operational checklists and reviewing submitted checklist reports. Checklist types and questions are maintained from administration settings.",
        features: ["Checklist submission", "Checklist reports", "Checklist types", "Questions"],
        routes: ["/checklist-submit", "/checklist-reports", "/checklist-types", "/questions"],
    },
    {
        name: "Announcements",
        aliases: ["announcement", "notice", "notification", "broadcast"],
        audience: "employee",
        summary: "Announcements provides the application's internal communication area for publishing and viewing organizational notices.",
        features: ["Create and manage announcements", "View announcements"],
        routes: ["/announcements"],
    },
    {
        name: "Gallery & Assets",
        aliases: ["gallery", "photo", "photos", "image", "asset", "marketing asset", "legal asset"],
        audience: "employee",
        summary: "Gallery stores operational photos and supports mobile upload sessions. Asset Management contains business assets with separate marketing and legal asset areas.",
        features: ["Gallery browsing and categories", "Mobile gallery upload", "Photo download and deletion", "Marketing assets", "Legal assets"],
        routes: ["/gallery", "/gallery/mobile/:token", "/asset-master", "/asset-management", "/legal-assets"],
    },
    {
        name: "Attendance",
        aliases: ["attendance", "present", "absent", "attendance report", "punch"],
        audience: "employee",
        summary: "Attendance records employee attendance activity and provides a separate reporting view for attendance analysis.",
        features: ["Attendance", "Attendance Reports"],
        routes: ["/attendance", "/attendance-reports"],
    },
    {
        name: "Employee Location",
        aliases: ["employee location", "location", "live location", "gps", "tracking location"],
        audience: "employee",
        summary: "Employee Location handles employee location updates and device registration. Live location, history and access logs are restricted to authorized administrators.",
        features: ["Location update", "Device/mobile registration", "My location status", "Admin live view", "History and access logs"],
        routes: ["/employee-location"],
    },
    {
        name: "Team Chat",
        aliases: ["chat", "message", "messaging", "team chat", "call", "calling"],
        audience: "employee",
        summary: "Team Chat provides authenticated internal messaging and calling capabilities for users who have Chat permission.",
        features: ["Internal chat", "Calling", "Emoji support"],
        routes: ["/chat"],
    },
    {
        name: "New Store Openings",
        aliases: ["new store", "new store opening", "nso", "store opening", "nso tracking", "nso rules"],
        audience: "employee",
        summary: "New Store Opening (NSO) workflows manage opening projects, rules and tracking information from initial setup through monitoring.",
        features: ["New Store Openings", "NSO Rules", "NSO Tracking", "NSO email settings"],
        routes: ["/new-store-openings", "/nso-rules", "/nso-tracking", "/settings/new-store-openings-email"],
    },
    {
        name: "Expenses & Petty Cash",
        aliases: ["expense", "expenses", "petty cash", "claim", "reimbursement", "expense approval", "expense report"],
        audience: "employee",
        summary: "Expenses supports entry, tracking and approval workflows. Petty Cash manages petty-cash records, expenses, deposits, settlement, cancellation, attachments and related email settings.",
        features: ["Expense entry", "Track expenses", "Approve expenses", "Petty Cash", "Bills/receipts and deposits", "Settlement and cancellation"],
        routes: ["/expenses/entry", "/expenses/track", "/expenses/approve", "/petty-cash", "/petty-cash/:id", "/petty-cash/email-settings"],
    },
    {
        name: "Billing",
        aliases: ["billing", "bill", "bills", "billing entry", "billing report", "daily billing"],
        audience: "employee",
        summary: "Billing handles bill entry, bill records, billing reports and billing audit/detail views.",
        features: ["Billing entry", "Bills", "Daily billing report", "Billing audit/details"],
        routes: ["/billing/entry", "/billing/bills", "/billing/bills/:id", "/billing/daily-report"],
    },
    {
        name: "Daily Collection",
        aliases: ["daily collection", "collection", "cash collection", "daily cash", "collection report"],
        audience: "employee",
        summary: "Daily Collection is a separate operational module for recording and reporting daily store collections. Administrative controls include blocked records and email settings.",
        features: ["Daily collection entry", "Store-wise collection", "Collection reports", "Blocked collection controls", "Bulk upload", "Admin email settings"],
        routes: ["/billing/daily-collection", "/daily-collection", "/daily-collection/report", "/daily-collection/reports"],
    },
    {
        name: "Sales Team",
        aliases: ["sales", "sales team", "visit planner", "travel plan", "travel approval", "sales review"],
        audience: "employee",
        summary: "Sales Team contains visit planning, travel planning, travel approvals and sales review workflows, controlled by module permissions.",
        features: ["Visit Planner", "Travel Plan", "Travel Plan Approvals", "Sales Review"],
        routes: ["/visit-planner", "/travel-plan", "/travel-plan-approval", "/sales-review"],
    },
    {
        name: "Listing Tracker",
        aliases: ["listing", "listing tracker", "tracking listing"],
        audience: "employee",
        summary: "Listing Tracker manages listing-related operational tracking for authorized users.",
        features: ["Listing tracking", "Permission-controlled access"],
        routes: ["/listing-tracker"],
    },
    {
        name: "Inventory Planning",
        aliases: ["inventory", "inventory planning", "erp", "erp upload", "sales upload", "inventory plan"],
        audience: "employee",
        summary: "Inventory Planning manages ERP sales data and planning workflows, including upload, analysis, plans and exports.",
        features: ["ERP data upload", "Sales data", "Analysis", "Inventory plans", "Exports"],
        routes: ["/inventory-planning", "/inventory-planning/erp-upload"],
    },
    {
        name: "Collection Tracking",
        aliases: ["collection tracking", "products", "sku", "master data", "collection request", "collection insight"],
        audience: "employee",
        summary: "Collection Tracking provides product/SKU management, master data, insights, requests and permission-related screens.",
        features: ["Product list", "Add products", "SKU details", "Insight", "Requests", "Master Data", "Permissions"],
        routes: ["/collection-tracking", "/collection-tracking/add-products", "/collection-tracking/sku-details/:id", "/collection-tracking/insight", "/collection-tracking/requests", "/collection-tracking/master-data", "/collection-tracking/permissions"],
    },
    {
        name: "Quiz & Training",
        aliases: ["quiz", "training", "training report", "test", "assessment", "quiz report"],
        audience: "employee",
        summary: "Quiz & Training provides quiz setup, taking quizzes, training reports and quiz email settings. A public quiz route is also available through a token.",
        features: ["Quiz setup", "Take Quiz", "Training Report", "Quiz email settings", "Public token-based quiz"],
        routes: ["/quiz/setup", "/quiz/take", "/quiz/report", "/quiz/email", "/quiz/:token"],
    },
    {
        name: "Users & Organization",
        aliases: ["users", "user", "employee", "department", "designation", "store management", "stores", "reports to", "hierarchy", "organization"],
        audience: "employee",
        summary: "Administration manages users and core organization masters such as departments, designations, stores and reporting hierarchy. Access is controlled by administrator status and permissions.",
        features: ["Users", "Departments", "Designations", "Stores", "Reports To / hierarchy"],
        routes: ["/users", "/departments", "/designations", "/stores", "/reports-to", "/settings/users", "/settings/departments", "/settings/designations", "/settings/stores", "/settings/hierarchy"],
    },
    {
        name: "Settings & Profile",
        aliases: ["settings", "profile", "appearance", "theme", "email settings", "password", "reset password", "forgot password", "login"],
        audience: "employee",
        summary: "Profile and Settings contain personal profile controls, appearance preferences, module-specific configuration and authentication recovery screens.",
        features: ["Profile", "General settings", "Appearance", "Checklist/NSO email settings", "Forgot password", "OTP verification", "Reset password"],
        routes: ["/profile", "/settings", "/settings/appearance", "/forgot-password", "/verify-otp", "/reset-password"],
    },
    {
        name: "Activity Center & Notifications",
        aliases: ["activity", "activity center", "audit", "notification", "notifications", "alert", "unread"],
        audience: "employee",
        summary: "Activity Center provides activity records and details, while the notification system delivers application alerts and unread/read state management.",
        features: ["Activity Center", "Activity details", "Notification center", "Read/unread notifications"],
        routes: ["/activity-center", "/activity-center/:id"],
    },
    {
        name: "Help Center & Zarvis",
        aliases: ["help", "help center", "zarvis", "support", "human support", "customer support", "help desk", "care desk", "faq"],
        audience: "both",
        summary: "Help Center is the 24×7 self-service support layer. Zarvis searches administrator-approved answers first, then the application's safe project knowledge. When neither source can confidently answer, an authenticated employee can open a human-support ticket for an administrator reply.",
        features: ["Verified FAQ answers", "Zarvis project knowledge", "Related answers", "Human support tickets", "Administrator knowledge management", "Administrator manual support replies"],
        routes: ["/help", "/help-center"],
    },
];

const PLAYBOOKS = [
    {
        aliases: ["reset password", "forgot password", "change password", "password reset", "password"],
        audience: "employee",
        answer: "To recover a Miarcus password, use the Forgot Password screen, complete the OTP verification step, and then use the Reset Password screen to set the new password. If your account is inactive or the OTP cannot be completed, contact an administrator through Human Support.",
        module: "Settings & Profile",
        routes: ["/forgot-password", "/verify-otp", "/reset-password"],
    },
    {
        aliases: ["raise action point", "create action point", "add action point", "new action point", "action point"],
        audience: "employee",
        answer: "To raise an Action Point, open Action Points from the sidebar and use Add Action Point. Fill in the operational context, owner/details, status and priority as applicable, then save. The Action Points screen also supports filtering, history review, export and bulk upload.",
        module: "Action Points",
        routes: ["/action-points"],
    },
    {
        aliases: ["submit checklist", "checklist submission", "complete checklist", "checklist report"],
        audience: "employee",
        answer: "For an operational checklist, open Checklist Submit, complete the questions and submit the checklist. Submitted information can then be reviewed from Checklist Reports. Checklist Types and Questions are maintained from the administration areas when the user has the required permission.",
        module: "Checklist",
        routes: ["/checklist-submit", "/checklist-reports", "/checklist-types", "/questions"],
    },
    {
        aliases: ["daily collection", "submit collection", "cash collection", "collection entry"],
        audience: "employee",
        answer: "Daily Collection is a separate module for recording store-wise daily collections and reviewing collection reports. Open Daily Collection from the sidebar, enter the required collection information and submit it. Administrative users also have controls for blocked records, bulk upload, deletion and email settings.",
        module: "Daily Collection",
        routes: ["/billing/daily-collection", "/daily-collection", "/daily-collection/reports"],
    },
    {
        aliases: ["expense", "submit expense", "expense entry", "reimbursement"],
        audience: "employee",
        answer: "For an expense, open the Expenses area and use Expense Entry. Saved expenses can be followed from Track Expenses, while authorized approvers use Approve Expenses to process them.",
        module: "Expenses & Petty Cash",
        routes: ["/expenses/entry", "/expenses/track", "/expenses/approve"],
    },
    {
        aliases: ["where are reports", "see reports", "reports", "report"],
        audience: "employee",
        answer: "Miarcus has reports inside the relevant module rather than one single report page. Common report areas include Dashboard Analytics, Checklist Reports, Attendance Reports, Daily Billing Report, Daily Collection Reports, Training Report and module-specific exports.",
        module: "Dashboard / Reporting",
        routes: ["/dashboard-analytics", "/checklist-reports", "/attendance-reports", "/billing/daily-report", "/daily-collection/reports", "/quiz/report"],
    },
];

const STOP = new Set(["the", "and", "for", "how", "what", "where", "when", "with", "can", "could", "would", "does", "from", "this", "that", "about", "into", "have", "has", "are", "is", "my", "our", "your", "i", "me", "to", "of", "in", "on", "a", "an", "do", "please", "tell", "want", "need"]);

const tokens = (text) => String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9/:-]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word));

const scoreEntry = (question, entry) => {
    const q = tokens(question);
    const hay = tokens([entry.name, ...(entry.aliases || []), entry.summary, ...(entry.features || []), ...(entry.routes || [])].join(" "));
    if (!q.length) return 0;
    let score = 0;
    const joinedQ = q.join(" ");
    for (const alias of entry.aliases || []) {
        const a = tokens(alias);
        if (a.length && a.every((part) => q.includes(part))) score += 8 + a.length * 2;
        if (a.length && joinedQ.includes(a.join(" "))) score += 6;
    }
    for (const word of q) if (hay.includes(word)) score += 1.6;
    return score;
};

const audienceAllowed = (entry, audience) => audience === "customer" ? entry.audience === "both" : true;

const answerForEntry = (entry) => {
    const featureText = entry.features.map((x) => `• ${x}`).join("\n");
    const routeText = entry.routes.length ? `\n\nWhere to find it:\n${entry.routes.map((x) => `• ${x}`).join("\n")}` : "";
    return `${entry.name}: ${entry.summary}\n\nWhat it covers:\n${featureText}${routeText}`;
};

const searchProjectKnowledge = (question, audience = "employee") => {
    const cleanQuestion = String(question || "").trim();
    if (!cleanQuestion) return { resolved: false, matches: [] };

    const normalized = cleanQuestion.toLowerCase();
    if (["describe the project", "what is miarcus", "what does miarcus do", "tell me about miarcus", "project structure", "modules in miarcus", "what modules are there"].some((phrase) => normalized.includes(phrase))) {
        const isCustomer = audience === "customer";
        const answer = isCustomer
            ? "Miarcus provides a secure Help Center and support experience where customers can browse verified answers and ask Zarvis questions. Customer-facing answers are controlled by the Miarcus administrator, and questions that need a person can be routed to support."
            : `${OVERVIEW}\n\nCurrent application footprint: ${PROJECT_SNAPSHOT.frontendRoutes} frontend routes, ${PROJECT_SNAPSHOT.pageSourceFiles} page source files, ${PROJECT_SNAPSHOT.backendRouteFiles} backend route files, ${PROJECT_SNAPSHOT.controllers} controllers and ${PROJECT_SNAPSHOT.models} models. Zarvis uses this product-level map instead of exposing source code, credentials or private configuration.`;
        return {
            resolved: true,
            source: "project_knowledge",
            confidence: 99,
            module: isCustomer ? "Customer Help Center" : "Miarcus Project",
            answer,
            matches: MODULES.filter((m) => audienceAllowed(m, audience)).slice(0, 6).map((m) => ({ title: m.name, question: m.name, answer: m.summary, source: "project_knowledge" })),
        };
    }

    const playbookScores = PLAYBOOKS.filter((p) => audienceAllowed(p, audience)).map((p) => ({ ...p, score: scoreEntry(cleanQuestion, { ...p, name: p.module, summary: p.answer, features: [], routes: p.routes }) })).sort((a, b) => b.score - a.score);
    const bestPlaybook = playbookScores[0];
    if (bestPlaybook && bestPlaybook.score >= 10) {
        return {
            resolved: true,
            source: "project_knowledge",
            confidence: Math.min(96, Math.round(55 + bestPlaybook.score * 3)),
            module: bestPlaybook.module,
            answer: bestPlaybook.answer,
            matches: playbookScores.slice(1, 4).filter((x) => x.score >= 5).map((x) => ({ title: x.module, question: x.module, answer: x.answer, source: "project_knowledge" })),
        };
    }

    const ranked = MODULES.filter((m) => audienceAllowed(m, audience))
        .map((m) => ({ ...m, score: scoreEntry(cleanQuestion, m) }))
        .filter((m) => m.score > 0)
        .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (!best || best.score < 4.5) return { resolved: false, matches: ranked.slice(0, 4).map((m) => ({ title: m.name, question: m.name, answer: m.summary, source: "project_knowledge" })) };

    return {
        resolved: true,
        source: "project_knowledge",
        confidence: Math.min(94, Math.round(42 + best.score * 4)),
        module: best.name,
        answer: answerForEntry(best),
        matches: ranked.slice(1, 4).map((m) => ({ title: m.name, question: m.name, answer: m.summary, source: "project_knowledge" })),
    };
};

module.exports = { searchProjectKnowledge, PROJECT_SNAPSHOT };
