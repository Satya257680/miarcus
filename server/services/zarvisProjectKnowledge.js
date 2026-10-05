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
        answer: "If you forgot your Miarcus password, contact the Administrator and request a password reset. If you still remember your old/current password, you do not need the forgot-password flow: open your Profile, use Change Password, enter the current password, enter the new password and save it. The new password must be different from the current password.",
        module: "Settings & Profile",
        routes: ["/profile", "/forgot-password", "/verify-otp", "/reset-password"],
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

const STOP = new Set([
    "the","and","for","how","what","where","when","with","can","could","would","does","from","this","that","about","into","have","has","are","is","my","our","your","i","me","to","of","in","on","a","an","do","please","tell","want","need","it","its","there","then","just","ok","okay","thanks","thank","you"
]);

const SYNONYMS = {
    pwd: "password", pass: "password", signin: "login", signon: "login", logon: "login",
    faq: "help", guide: "help", supportdesk: "support", bot: "zarvis", chatbot: "zarvis",
    nsos: "nso", newstore: "nso", opening: "nso", openings: "nso",
    ap: "action point", actions: "action point", task: "action point", tasks: "action point",
    check: "checklist", checks: "checklist", inspection: "checklist", inspections: "checklist",
    cash: "collection", collections: "collection", expenseclaim: "expense", reimbursement: "expense",
    staff: "employee", worker: "employee", user: "employee", users: "employee",
};

const normalizeText = (text) => String(text || "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9/:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (text) => normalizeText(text)
    .split(" ")
    .map((word) => SYNONYMS[word] || word)
    .flatMap((word) => word.split(" "))
    .filter((word) => word.length > 2 && !STOP.has(word));

const editDistance = (a, b) => {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
        let prev = row[0]; row[0] = i;
        for (let j = 1; j <= b.length; j += 1) {
            const saved = row[j];
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = saved;
        }
    }
    return row[b.length];
};

const fuzzyWordMatch = (word, candidate) => {
    if (word === candidate) return 1;
    if (word.length >= 5 && candidate.startsWith(word.slice(0, 4))) return 0.82;
    const max = Math.max(word.length, candidate.length);
    if (max < 4) return 0;
    const distance = editDistance(word, candidate);
    return distance <= 2 ? 1 - distance / max : 0;
};

const scoreEntry = (question, entry) => {
    const q = tokens(question);
    if (!q.length) return 0;
    const hayTokens = tokens([
        entry.name, ...(entry.aliases || []), entry.summary,
        ...(entry.features || []), ...(entry.routes || []), ...(entry.keywords || [])
    ].join(" "));
    const hay = new Set(hayTokens);
    const joinedQ = q.join(" ");
    let score = 0;
    for (const alias of entry.aliases || []) {
        const aliasNormalized = normalizeText(alias);
        const aliasTokens = tokens(aliasNormalized);
        if (aliasTokens.length && aliasTokens.every((part) => q.includes(part))) score += 10 + aliasTokens.length * 3;
        if (aliasNormalized && joinedQ.includes(aliasNormalized)) score += 9;
    }
    for (const word of q) {
        if (hay.has(word)) score += 2.2;
        else {
            let best = 0;
            for (const candidate of hay) best = Math.max(best, fuzzyWordMatch(word, candidate));
            score += best * 1.2;
        }
    }
    return score;
};

const audienceAllowed = (entry, audience) => audience === "customer" ? entry.audience === "both" : true;

const answerFromEntry = (entry) => {
    const lines = [`## ${entry.name}`, entry.summary];
    if (entry.features?.length) {
        lines.push("", "### What it does", ...entry.features.map((x) => `- ${x}`));
    }
    if (entry.routes?.length) {
        lines.push("", "### Where to find it", ...entry.routes.map((x) => `- ${x}`));
    }
    if (entry.howItWorks) lines.push("", "### How it works", entry.howItWorks);
    if (entry.dataFlow) lines.push("", "### Behind the scenes", entry.dataFlow);
    if (entry.permissions) lines.push("", "### Access", entry.permissions);
    return lines.join("\n");
};

const PROJECT_DETAILS = {
    "New Store Openings": {
        howItWorks: "NSO is a workflow, not just a single form. A project is created with location/city and possession information. The workflow service prepares the project, generates or preserves its timeline, assigns the default Planning status, and records history/notifications. Editing recalculates the workflow when appropriate. Status changes are guarded by the NSO status service and are recorded in history.",
        dataFlow: "The main UI is in client/src/pages/NewStoreOpening and client/src/pages/NSOTracking.jsx. On the server, the NSO workflow is coordinated by server/services/nsoWorkflowService.js, business calculations by nsoService.js, dates by nsoTimelineService.js, statuses by nsoStatusService.js, history by nsoHistoryService.js and email by nsoEmailService.js. NSO Tracking persists rule/department/trigger/status/due-date/remarks data through server/models/nsoTrackingModel.js. NSO Rules use nsoRuleModel.js and can be connected to departments.",
        permissions: "NSO Tracking uses the 'NSO Tracking' permission with View/Add/Edit/Full levels. NSO Rules follows permission checks and administrators receive full access in the current UI. Email settings are administration-only.",
    },
};

const MODULES_BY_NAME = new Map(MODULES.map((entry) => [entry.name, entry]));
for (const [name, detail] of Object.entries(PROJECT_DETAILS)) {
    const entry = MODULES_BY_NAME.get(name);
    if (entry) Object.assign(entry, detail);
}

const DETAILED_PLAYBOOKS = [
    {
        aliases: ["how nso works", "nso working", "explain nso", "nso process", "new store opening process", "create nso", "add nso", "put nso", "setup nso"],
        module: "New Store Openings",
        answer: `## New Store Opening (NSO) — complete flow\n\nNSO manages a new-store project from planning through opening. In this Miarcus project, the workflow is split across the UI and several backend services so that dates, status, tracking, history and notifications are kept consistent.\n\n### 1. Create the NSO project\nOpen **New Store Openings** and create the project. The core validation requires **Location**, **City** and **Possession Date (LOI)**. The project can also contain broker/actual possession dates and other opening information.\n\n### 2. Timeline calculation\nThe system uses the actual possession date first; if that is unavailable it falls back to broker possession and then LOI possession. In automatic mode it calculates milestones in sequence: Layout by NSO (+2 days), Revised Layout (+2), Approval (+3), Operations visit (+5), GST (+2), HR hiring (+2), Team training (+7), NSO team visit, Plan of Stock (+5), Plan of Collaterals, On-field training (+5), Dispatch Stock (+5), NSO Handover (+4), VM Handover, Scanning and Billing Start (+5). Manual timeline mode is preserved and is not regenerated.\n\n### 3. Status flow\nThe normal progression is **Planning → Layout Pending → Approval Pending → Construction → Training → Ready For Opening → Opened → Completed**. **On Hold** and **Cancelled** are controlled exceptions. A project on hold can return to Ready For Opening after the allowed inspection/status transition. Status changes are guarded by the NSO status service and history is recorded.\n\n### 4. NSO Rules\nNSO Rules define a trigger column, expected answer, priority, SLA days, whether an Action Point should be created, whether the rule is mandatory, active state and linked departments. Rules are maintained from **NSO Rules** and are used as operational conditions for NSO tracking.\n\n### 5. NSO Tracking\nNSO Tracking connects an NSO project with a rule and department and stores the trigger column, tracking status, due date and remarks. Authorized users can view/add/edit; Full permission is required for deletion. Tracking supports search, pagination, status updates, project summaries and export.\n\n### 6. Inspection and Action Points\nThe project is also connected to checklist/inspection information and Action Points. The project summary can show checklist count, average inspection score, open Action Points, overdue Action Points and activity count.\n\n### 7. History and notifications\nCreate/update/delete/status operations are logged through the NSO history/activity services. Project notifications are sent through the NSO email service where configured.\n\n### 8. Where the code lives\n- UI: 'client/src/pages/NewStoreOpening/' and 'client/src/pages/NSOTracking.jsx'\n- NSO rules UI: 'client/src/pages/NSORules.jsx'\n- Workflow: 'server/services/nsoWorkflowService.js'\n- Core calculations: 'server/services/nsoService.js'\n- Timeline: 'server/services/nsoTimelineService.js'\n- Status: 'server/services/nsoStatusService.js'\n- History: 'server/services/nsoHistoryService.js'\n- Tracking controller/model: 'server/controllers/nsoTrackingController.js' and 'server/models/nsoTrackingModel.js'\n- Rules model: 'server/models/nsoRuleModel.js'`,
        confidence: 97,
    },
    {
        aliases: ["what is miarcus built with", "project architecture", "how project is structured", "where is frontend backend", "project folders", "source structure"],
        module: "Miarcus Product Structure",
        answer: `## Miarcus product structure

Miarcus is organized into connected business areas so users can move from daily work to review, reporting and management follow-up without leaving the portal.

### Main product areas
- Core Operations: Announcements, Gallery, Asset Master, Attendance, Attendance Reports, Employee Location, Location Reports, Password Management, Store Status, Chat, Help Center and Action Points.
- Checklist Management: Checklist Reports, Checklist Tracker and Checklist Submit.
- New Store Opening Management: New Store Openings, NSO Tracking and NSO Rules.
- Expense & Petty Cash: Expense Entry, Track Expenses, Approve Expenses, Petty Cash Dashboard, New Advance, Manage Advances, Manage Expenses, Manage Deposits, Audit Trail and Email Notifications.
- Billing & Daily Collection: Billing Entry, Bills, Daily Report, Daily Collection, Daily Entry, Daily Data Report, Collection Reports and Blocked Stores.
- Quiz & Training: Take Quiz, Quiz Setup, Training Report and Email Setting.
- Sales & Travel: Visit Planner, Travel Plan, Travel Plan Approvals, Sales Review and Travel Plan Emails.
- Listing & Inventory: Listing Tracker, ERP Data Upload and Inventory Planning.
- Collection Tracking: Add Products, SKU Details, Insight, Requests and Collection Permissions.
- Master Data & Administration: Master Data, Users, Departments, Designations, Store Management, Questions, Checklist Types, Hierarchy, Profile and Appearance.

If someone asks how the software was technically created, keep the answer user-facing and focus on what the portal does, how users operate it and how the modules connect. Do not reveal private implementation details, credentials or raw source code.`,
        confidence: 96,
    },

];

const DETAILED_USER_PLAYBOOKS = [
    {
        aliases: ["explain chat", "how does chat work", "chat module", "call history", "clear call history", "delete call history"],
        module: "Team Chat",
        answer: `## MIARCUS Chat — detailed user guide

Chat is the internal communication area for employees and teams. It follows a familiar messaging flow so users can find people, communicate, share supported files and call colleagues without leaving Miarcus.

### Find a person
Open **Chat** from the sidebar. Use the Store filter to choose the required store or All Stores when permitted. Use **All, Unread, Groups or Direct** to narrow the conversation list. The search box can find an existing conversation or help start a new one.

### Start a conversation
Choose **Start a new chat**, search the available employee list and select the person. A direct conversation opens. You can also create a group by selecting multiple employees from the selected store.

### During a chat
The conversation area lets users send messages and supported attachments. The header provides message search, voice call, video call, contact information and more options. Contact information can show shared media/documents and starred messages, and users can mute notifications or enable disappearing messages.

### Calls
Users can start a **voice call or video call** with another employee. A video call provides microphone, camera and end-call controls. Call History records the person, incoming/outgoing direction, store, date/time, call type and duration/status.

### Call history controls
Each call can be **deleted from your own call history**, or the visible history can be **cleared**. Removing history does not delete the actual call or remove it from another participant's history. New calls will continue appearing normally.

### Chat cleanup
**Clear Chat** removes messages from your own view according to the chat controls. **Delete Chat** removes the conversation from your chat list according to the selected deletion option.

### Simple flow
**Chat → Store/Search → All/Unread/Groups/Direct → Employee/Group → Message/File → Voice/Video Call → Contact Information → Call History**`,
    },
    {
        aliases: ["explain help center", "how help center works", "how zarvis works", "voice assistant", "ask zarvis"],
        module: "Help Center & Zarvis",
        answer: `## Help Center & Zarvis — detailed user guide

The Help Center is the Miarcus support and guidance area. It combines searchable help information, Zarvis, optional voice assistance and human support.

### 1. Search Help
Open **Help Center** from the sidebar. Search guides and common questions by words or phrases. Category filters help narrow the available guidance.

### 2. Ask Zarvis
Open **Ask Zarvis** and ask naturally. You do not have to use exact wording. Zarvis can explain Miarcus modules, screens, workflows and supported project information, and it can keep the conversation context for follow-up questions.

### 3. Detailed answers
For a broad question such as “Explain Miarcus”, Zarvis should give a project-level business overview covering the main operational areas, not only a one-line answer. For a specific module, it can explain the purpose, main actions and normal user flow.

### 4. Voice assistant
Use the microphone in Ask Zarvis to speak a question when browser voice input is available. Zarvis can also read its written answer aloud. Voice is an optional convenience feature; normal typing and reading remain available.

### 5. Human Support
If Zarvis cannot resolve the issue, open **My Support**, enter a subject and detailed description, select the priority and send the request. Previous requests remain visible with their status, and the conversation can continue until the issue is resolved or closed.

### 6. Admin support
Administrators can maintain verified answers and manage the manual support queue. This keeps approved information available for future users and connects self-service guidance with human support.

### Complete flow
**Help Center → Search / Ask Zarvis → Detailed explanation → Voice assistance if wanted → Human Support if required → Admin reply → Continued conversation → Resolution**`,
    },
];

const greetings = /^(hi|hello|hey|hii|hiii|good morning|good afternoon|good evening|namaste)[!.\s]*$/i;
const thanks = /^(thanks|thank you|thx|tq|ty|thanku|thanks a lot|ok thanks|okay thanks)[!.\s]*$/i;
const acknowledgement = /^(ok|okay|alright|fine|great|cool|got it|understood|yes|yep|yeah)[!.\s]*$/i;

const findBest = (question, entries) => entries
    .map((entry) => ({ ...entry, score: scoreEntry(question, entry) }))
    .sort((a, b) => b.score - a.score);

const buildProjectSnapshot = () => {
    // Keep this runtime-safe: count only product source folders and never expose filenames/contents.
    try {
        const fs = require("fs");
        const path = require("path");
        const root = path.resolve(__dirname, "../..");
        const count = (relative) => {
            const dir = path.join(root, relative);
            if (!fs.existsSync(dir)) return 0;
            let total = 0;
            const walk = (current) => {
                for (const item of fs.readdirSync(current, { withFileTypes: true })) {
                    if (["node_modules", ".git", "uploads", "certs"].includes(item.name)) continue;
                    const full = path.join(current, item.name);
                    if (item.isDirectory()) walk(full);
                    else if (/\.(jsx?|css|json)$/.test(item.name)) total += 1;
                }
            };
            walk(dir); return total;
        };
        const frontendFiles = count("client/src");
        const backendFiles = count("server");
        return { frontendFiles, backendFiles, generatedAt: new Date().toISOString() };
    } catch { return PROJECT_SNAPSHOT; }
};

const RUNTIME_SNAPSHOT = buildProjectSnapshot();

const searchProjectKnowledge = (question, audience = "employee", context = {}) => {
    const cleanQuestion = String(question || "").trim();
    if (!cleanQuestion) return { resolved: false, matches: [] };

    if (thanks.test(cleanQuestion)) return { resolved: true, source: "conversation", confidence: 100, module: "Zarvis", answer: "You're very welcome! 😊 If you have another Miarcus question, just ask me — you can type it or use the microphone.", matches: [] };
    if (greetings.test(cleanQuestion)) return { resolved: true, source: "conversation", confidence: 100, module: "Zarvis", answer: "Hello! 👋 I'm Zarvis. Ask me about any Miarcus module, workflow, screen, NSO process, report, Action Point, Checklist, Billing or anything else in the application. I’ll give the clearest answer I can from the approved knowledge and project structure.", matches: [] };
    if (acknowledgement.test(cleanQuestion)) return { resolved: true, source: "conversation", confidence: 100, module: "Zarvis", answer: "Perfect. 👍 Whenever you're ready, ask your next question. If you mean something from my previous answer, you can say things like ‘explain that’, ‘how do I do that?’, or ‘tell me more about NSO’.", matches: [] };

    const normalized = normalizeText(cleanQuestion);
    const contextual = String(context?.lastModule || "").trim();
    const expanded = context?.isFollowUp && contextual ? `${cleanQuestion} ${contextual}` : cleanQuestion;

    const projectOverviewIntent = /(describe.*project|what is miarcus|what does miarcus do|tell me about miarcus|explain.*project|miarcus project)/i.test(normalized);
    if (projectOverviewIntent) {
        const answer = `## Miarcus — complete project overview

Miarcus is a centralized Retail Operations and Management Portal designed to bring store operations, employee activities, compliance, financial work, communication, planning and reporting into one place. Instead of depending on separate spreadsheets, paper records, emails and disconnected tools, users work through organized modules from the same portal.

### 1. Home, Login and Dashboard
The portal starts with a landing page that introduces Miarcus and guides users to Sign In. After login, the Dashboard provides a practical overview of the activities available to the user. It brings together important counts, recent activity, notifications, profile access and analytics, while the sidebar provides access to the modules permitted for that user.

### 2. Communication and information
**Announcements** is the digital company notice board for policies, notices, circulars and important updates. Authorized users can create announcements, choose the audience, attach supported documents or media, pin important notices, and later view, edit, export or delete them.

**Gallery** is the central media area for photos, videos, audio and supported documents. Media can come from the website, mobile upload or other modules such as checklist submissions. Users can search and filter media and, according to permission, view, download or delete files.

**Notifications** keeps users informed about relevant portal activity and provides unread/read management.

### 3. Employees, stores and daily workforce operations
**Users, Departments, Designations, Store Management and Reporting Hierarchy** maintain the organization structure. Access is role- and permission-based, so employees only see the areas required for their work.

**Attendance** records employee attendance activity. **Attendance Reports** allow authorized users to search and filter attendance by employee, store, date and status, inspect attendance details, review available photo/map evidence and export records.

**Employee Location** supports location-related employee activity and reporting for authorized users.

**Store Status** provides administrators with a quick view of store availability and manager activity.

### 4. Chat and internal communication
**MIARCUS Chat** provides a familiar employee-to-employee communication experience. Users can search employees, select a store, use All/Unread/Groups/Direct filters, start direct or group conversations, exchange messages and supported files, and use voice or video calling. Contact information includes media, starred messages, mute controls, disappearing messages, Clear Chat and Delete Chat. Call History records previous calls with the person, direction, store, date/time and call type.

### 5. Help Center and Zarvis
**Help Center** is the 24×7 guidance and support area. Users can search guides, ask Zarvis natural-language questions, continue follow-up questions, choose a language, listen to answers aloud and move to Human Support when needed. Human Support keeps support requests and replies together until the issue is resolved or closed. Administrators can maintain verified answers and manage the support queue.

### 6. Checklist and Action Points
**Checklist Management** is a major operational workflow. Authorized administrators maintain checklist types and questions, while employees submit store-level checklists, answer questions, add remarks and provide photographs where required. Submissions can be reviewed through Checklist Reports and tracking views.

When an operational issue is identified, it can become an **Action Point**. Action Points can be assigned, prioritized, followed up and tracked until completion. This connects field/checklist observations with corrective work.

### 7. New Store Opening (NSO)
**New Store Openings** manages store-opening projects and their progress. It covers store/project information, important possession and opening dates, project timelines, milestones, descriptions and supporting documents.

**NSO Tracking** follows project milestones and operational tracking information, while **NSO Rules** define conditions and expected actions used during the opening process. The NSO area supports project monitoring, progress review, delayed-project identification, search/filtering and management reporting.

### 8. Expenses and Petty Cash
**Expense Entry, Track Expenses and Approve Expenses** support the complete expense workflow from submission through review and approval.

**Petty Cash** provides dashboard, advance, settlement, expense, deposit, audit and email-notification functions. It helps authorized users maintain a structured record of petty-cash activity and related supporting information.

### 9. Billing and Daily Collection
**Billing** manages billing entry, bills and billing reports.

**Daily Collection** handles store-wise daily collection activities and related reports. The broader collection area includes daily entry, daily data/report views, collection reports and blocked-store controls. Authorized users can use filtering, bulk upload and export functions where provided.

### 10. Quiz and Training
**Quiz and Training Management** provides quiz setup, employee quiz participation, training reporting and email settings. It supports organized employee learning and assessment activities.

### 11. Sales Team and Travel
**Visit Planner** helps organize planned field visits.

**Travel Plan** manages travel-related planning, while **Travel Plan Approvals** handles approval workflows. **Sales Review** provides a dedicated area for reviewing sales-team activities and performance-related information. Travel-related email settings are also available to authorized users.

### 12. Listing and Inventory
**Listing Tracker** provides listing-related operational tracking.

**ERP Data Upload** and **Inventory Planning** support inventory-related data handling, planning and review. These areas help management maintain product and inventory information in a structured manner.

### 13. Collection Tracking
**Collection Tracking** includes Add Products, SKU Details, Insight, Requests and Collection Permissions. It is used for product/SKU information, collection-related insights and controlled access to collection activities.

### 14. Master Data and administration
The administration area maintains **Master Data, Users, Departments, Designations, Stores, Questions, Checklist Types, Hierarchy, Profile and Appearance**. These controls provide the foundation for consistent organization data and user access.

### 15. Reports, exports and data handling
Across the portal, users can search, filter and review operational information. Many areas provide pagination, bulk upload and exports such as CSV, Excel and PDF. Reports cover activities such as attendance, checklists, action points, billing, daily collection, expenses, inventory, training and sales-related operations.

### 16. Security and permissions from a user perspective
Miarcus uses protected access and role-based permissions. This means a user may see only the modules and actions assigned to their responsibilities. Administrators have additional management capabilities.

### 17. Password help
If a user **forgot their password**, contact the Administrator and request a password reset. If the user **still knows their old/current password**, they can use **Profile → Change Password**, enter the current password, choose a new password and save it. The new password should be different from the current password.

### Overall Miarcus flow
**Login → Dashboard → Choose the required module → Perform the daily operation → Review/track the result → Reports/notifications → Management follow-up**

Miarcus is therefore not just a single form or dashboard. It is a connected retail-operations workspace covering people, stores, daily field work, compliance, new-store projects, money movement, collections, training, sales planning, inventory, communication, support and reporting. When a user asks about the whole project, explain it at this business/workflow level and do not describe how the software was technically created.`;
        return { resolved: true, source: "project_knowledge", confidence: 99, module: "Miarcus Project", answer, matches: MODULES.slice(0, 12).map((m) => ({ title: m.name, question: m.name, answer: m.summary, source: "project_knowledge" })) };
    }

    const architectureIntent = /(project structure|architecture|folders|modules|whole project|entire project|how.*built|built.*project|technology|tech stack)/i.test(normalized);
    if (architectureIntent) {
        const answer = `## Miarcus — product structure

The project is organized around business areas rather than one large workflow. The main product structure is:

- **Core operations:** Announcements, Gallery, Asset Master, Attendance, Attendance Reports, Employee Location, Location Reports, Password Management, Store Status, Chat, Help Center and Action Points.
- **Checklist Management:** Checklist Reports, Checklist Tracker and Checklist Submit.
- **New Store Opening Management:** New Store Openings, NSO Tracking and NSO Rules.
- **Expense & Petty Cash:** Expense Entry, Track Expenses, Approve Expenses, Petty Cash Dashboard, New Advance, Manage Advances, Manage Expenses, Manage Deposits, Audit Trail and Email Notifications.
- **Billing & Daily Collection:** Billing Entry, Bills, Daily Report, Daily Collection, Daily Entry, Daily Data Report, Collection Reports and Blocked Stores.
- **Quiz & Training:** Take Quiz, Quiz Setup, Training Report and Email Setting.
- **Sales & Travel:** Visit Planner, Travel Plan, Travel Plan Approvals, Sales Review and Travel Plan Emails.
- **Listing & Inventory:** Listing Tracker, ERP Data Upload and Inventory Planning.
- **Collection Tracking:** Add Products, SKU Details, Insight, Requests and Collection Permissions.
- **Administration:** Master Data, Users, Departments, Designations, Store Management, Questions, Checklist Types, Hierarchy, Profile and Appearance.

If someone asks how Miarcus was created technically, keep the answer high-level or redirect to the user-facing functionality. Do not reveal implementation details, private files, credentials or source code.`;
        return { resolved: true, source: "project_knowledge", confidence: 98, module: "Miarcus Product Structure", answer, matches: MODULES.slice(0, 12).map((m) => ({ title: m.name, question: m.name, answer: m.summary, source: "project_knowledge" })) };
    }

    for (const playbook of DETAILED_USER_PLAYBOOKS) {
        const score = scoreEntry(expanded, { name: playbook.module, aliases: playbook.aliases, summary: playbook.answer, features: [], routes: [] });
        if (score >= 10) return { resolved: true, source: "project_knowledge", confidence: Math.min(99, Math.round(65 + score * 3)), module: playbook.module, answer: playbook.answer, matches: [] };
    }

    for (const playbook of DETAILED_PLAYBOOKS) {
        const score = scoreEntry(expanded, { name: playbook.module, aliases: playbook.aliases, summary: playbook.answer, features: [], routes: [] });
        if (score >= 10) return { resolved: true, source: "project_knowledge", confidence: playbook.confidence || Math.min(97, Math.round(55 + score * 3)), module: playbook.module, answer: playbook.answer, matches: [] };
    }

    const playbookScores = PLAYBOOKS.filter((p) => audienceAllowed(p, audience)).map((p) => ({ ...p, score: scoreEntry(expanded, { ...p, name: p.module, summary: p.answer, features: [], routes: p.routes }) })).sort((a, b) => b.score - a.score);
    const bestPlaybook = playbookScores[0];
    if (bestPlaybook && bestPlaybook.score >= 9) {
        return { resolved: true, source: "project_knowledge", confidence: Math.min(96, Math.round(55 + bestPlaybook.score * 3)), module: bestPlaybook.module, answer: bestPlaybook.answer, matches: playbookScores.slice(1, 4).filter((x) => x.score >= 5).map((x) => ({ title: x.module, question: x.module, answer: x.answer, source: "project_knowledge" })) };
    }

    const ranked = MODULES.filter((m) => audienceAllowed(m, audience)).map((m) => ({ ...m, score: scoreEntry(expanded, m) })).filter((m) => m.score > 0).sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (!best || best.score < 3.8) {
        return { resolved: false, matches: ranked.slice(0, 4).map((m) => ({ title: m.name, question: m.name, answer: m.summary, source: "project_knowledge" })) };
    }
    return { resolved: true, source: "project_knowledge", confidence: Math.min(95, Math.round(48 + best.score * 4)), module: best.name, answer: answerFromEntry(best), matches: ranked.slice(1, 4).map((m) => ({ title: m.name, question: m.name, answer: m.summary, source: "project_knowledge" })) };
};

module.exports = { searchProjectKnowledge, PROJECT_SNAPSHOT };
