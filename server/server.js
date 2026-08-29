// ======================================================
// MIARCUS BACKEND SERVER
// ======================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const securityHeaders = require("./middleware/securityHeaders");
const { requestId, originGuard, contentTypeGuard } = require("./middleware/requestSecurity");
const securityAudit = require("./middleware/securityAudit");
const { apiLimiter, writeLimiter } = require("./middleware/apiRateLimit");
const adminOnly = require("./middleware/adminOnly");
const authMiddleware = require("./middleware/authMiddleware");
const { sendPrivateFile } = require("./middleware/privateFileAccess");
const SecurityModel = require("./models/securityModel");

// ======================================================
// UPLOAD CONFIGURATION
// ======================================================

process.env.MAX_UPLOAD_SIZE =
    process.env.MAX_UPLOAD_SIZE ||
    String(25 * 1024 * 1024);

// ======================================================
// APP
// ======================================================

const app = express();

app.disable("x-powered-by");
app.use(requestId);
app.use(securityHeaders);

// Render sits behind a trusted reverse proxy. This keeps req.ip accurate
// for authentication rate limiting without trusting arbitrary client headers.
app.set("trust proxy", 1);

// ======================================================
// PROCESS LEVEL SAFETY NET
// ======================================================

process.on("unhandledRejection", (reason) => {

    console.error("================================");
    console.error("🛑 UNHANDLED PROMISE REJECTION");
    console.error("================================");
    console.error(reason);
    console.error("================================");

});

process.on("uncaughtException", (err) => {

    console.error("================================");
    console.error("🛑 UNCAUGHT EXCEPTION");
    console.error("================================");
    console.error(err);
    console.error("================================");

});

// ======================================================
// DATABASE
// ======================================================

const db = require("./config/db");

// Resend email service configuration health check. This does not stop the API from
// starting; the Resend API key is used when an email is sent.
const { verifyMailer } = require("./config/mailer");

// ======================================================
// MODELS
// ======================================================

const ActionPoint =
    require("./models/actionPointModel");

const ChecklistSubmission =
    require("./models/checklistSubmissionModel");

const Announcement =
    require("./models/announcementModel");

const Quiz =
    require("./models/quizModel");

const Expense =
    require("./models/expenseModel");

const PettyCash =
    require("./models/pettyCashModel");

const ThemePreference =
    require("./models/themePreferenceModel");

const Gallery =
    require("./models/galleryModel");

const EmployeeLocation =
    require("./models/locationModel");

const SalesTeam =
    require("./models/salesTeamModel");

const ListingTracker =
    require("./models/listingTrackerModel");

const Attendance =
    require("./models/attendanceModel");

const Asset =
    require("./models/assetModel");

const InventoryPlanning =
    require("./models/inventoryPlanningModel");

const DailyCollection =
    require("./models/dailyCollectionModel");

const { startDailyCollectionScheduler } =
    require("./services/dailyCollectionScheduler");

const { startMobileLocationScheduler } =
    require("./services/mobileLocationScheduler");

// ======================================================
// REAL-TIME NOTIFICATIONS
// ======================================================

const Notification =
    require("./services/notificationService");

const CollectionTracking =
    require("./models/collectionTrackingModel");

const Chat =
    require("./models/chatModel");

const installNotificationEventMiddleware =
    require("./middleware/notificationEventMiddleware");

const installActivityAuditMiddleware =
    require("./middleware/activityAuditMiddleware");

const Activity = require("./models/activityModel");

// ======================================================
// CREATE TABLE HELPER
// ======================================================

function createTablesAsync(model, label) {

    return new Promise((resolve) => {

        try {

            if (
                !model ||
                typeof model.createTables !== "function"
            ) {

                console.warn(
                    `⚠️ ${label} model does not expose createTables()`
                );

                return resolve();

            }

            let settled = false;

            const finish = (err) => {

                if (settled) return;

                settled = true;

                if (err) {

                    console.error(
                        `❌ Failed to create/verify ${label} table(s):`,
                        err.message
                    );

                } else {

                    console.log(
                        `✅ ${label} table(s) verified`
                    );

                }

                resolve();

            };

            const result = model.createTables(finish);

            if (result && typeof result.then === "function") {

                result
                    .then(() => finish())
                    .catch(finish);

            }

        } catch (error) {

            console.error(
                `❌ ${label} table initialization error:`,
                error.message
            );

            resolve();

        }

    });

}

// ======================================================
// DATABASE INITIALIZATION
// ======================================================

async function initializeDatabase() {

    try {

        const connected =
            await db.connectWithRetry();

        if (!connected) {

            console.error(
                "🛑 Skipping table initialization — no database connection."
            );

            return;

        }

        console.log("");
        console.log(
            "=============================================="
        );

        console.log(
            "VERIFYING / CREATING REQUIRED TABLES"
        );

        console.log(
            "=============================================="
        );

        // --------------------------------------------------
        // ACTION POINTS
        // --------------------------------------------------

        await createTablesAsync(
            ActionPoint,
            "action_points"
        );

        // --------------------------------------------------
        // CHECKLIST SUBMISSIONS
        // --------------------------------------------------

        await createTablesAsync(
            ChecklistSubmission,
            "checklist_submissions"
        );

        // --------------------------------------------------
        // ANNOUNCEMENTS
        // --------------------------------------------------

        await createTablesAsync(
            Announcement,
            "announcements"
        );

        // --------------------------------------------------
        // QUIZ
        // --------------------------------------------------

        await createTablesAsync(
            Quiz,
            "quiz"
        );

        // --------------------------------------------------
        // EXPENSES
        // --------------------------------------------------

        await createTablesAsync(
            Expense,
            "expenses"
        );

        // --------------------------------------------------
        // PETTY CASH
        // --------------------------------------------------

        await createTablesAsync(
            PettyCash,
            "petty_cash"
        );

        // --------------------------------------------------
        // SALES TEAM
        // --------------------------------------------------
        await createTablesAsync(
            SalesTeam,
            "Sales Team"
        );

        // --------------------------------------------------
        // LISTING TRACKER
        // --------------------------------------------------
        await createTablesAsync(
            ListingTracker,
            "Listing Tracker"
        );

        // --------------------------------------------------
        // ATTENDANCE
        // --------------------------------------------------
        await createTablesAsync(
            Attendance,
            "Attendance"
        );

        // --------------------------------------------------
        // ASSET MASTER
        // --------------------------------------------------
        await createTablesAsync(
            Asset,
            "Asset Master"
        );

        await createTablesAsync(
            InventoryPlanning,
            "Inventory Planning"
        );

        // --------------------------------------------------
        // DAILY COLLECTION / STORE MANAGER DEADLINES
        // --------------------------------------------------
        try {
            await DailyCollection.ensureTables();
            console.log("✅ daily collection tables verified");
        } catch (error) {
            console.error("❌ daily collection table initialization failed:", error.message);
        }

        // --------------------------------------------------
        // USER THEME / APPEARANCE PREFERENCES
        // --------------------------------------------------
        try {
            await ThemePreference.ensureTable();
            console.log("✅ user_theme_preferences table verified");
        } catch (error) {
            console.error(
                "❌ user_theme_preferences table initialization failed:",
                error.message
            );
        }

        // --------------------------------------------------
        // GALLERY
        // --------------------------------------------------
        try {
            await Gallery.ensureTables();
            console.log("✅ gallery tables verified");
        } catch (error) {
            console.error("❌ gallery table initialization failed:", error.message);
        }

        // --------------------------------------------------
        // EMPLOYEE LOCATION
        // --------------------------------------------------
        try {
            await EmployeeLocation.ensureTables();
            console.log("✅ employee location tables verified");
        } catch (error) {
            console.error(
                "❌ employee location table initialization failed:",
                error.message
            );
        }

        // --------------------------------------------------
        // ACTIVITY CENTER / CHAT TABLES
        // --------------------------------------------------
        try {
            if (typeof Activity.ensureTables === "function") {
                await Activity.ensureTables();
                console.log("✅ Activity Center tables verified");
            }
        } catch (error) {
            console.error("❌ Activity Center table initialization failed:", error.message);
        }

        // --------------------------------------------------
        // REAL-TIME NOTIFICATIONS
        // --------------------------------------------------
        try {
            await Notification.ensureTable();
            console.log("✅ notifications table verified");
        } catch (error) {
            console.error("❌ notifications table initialization failed:", error.message);
        }

        // --------------------------------------------------
        // COLLECTION TRACKING
        // --------------------------------------------------
        try {
            await CollectionTracking.ensureTables();
            console.log("✅ collection tracking tables verified");
        } catch (error) {
            console.error("❌ collection tracking table initialization failed:", error.message);
        }

        // --------------------------------------------------
        // CHAT / MESSAGING
        // --------------------------------------------------
        try {
            await Chat.ensureTables();
            console.log("✅ chat tables verified");
        } catch (error) {
            console.error("❌ chat table initialization failed:", error.message);
        }

        // ==================================================
        // ACTION POINT QUESTION MIGRATION
        // ==================================================

        try {

            if (
                typeof ActionPoint.ensureQuestionColumn ===
                "function"
            ) {

                await ActionPoint.ensureQuestionColumn();

            }

        } catch (error) {

            console.error(
                "❌ action_points question migration failed:",
                error.message
            );

        }

        // ==================================================
        // ACTION POINT EXACT SLA MIGRATION
        // ==================================================

        try {

            if (
                typeof ActionPoint.ensureSlaMinutesColumn ===
                "function"
            ) {
                await ActionPoint.ensureSlaMinutesColumn();
                console.log(
                    "✅ action_points exact SLA duration verified"
                );
            }

        } catch (error) {

            console.error(
                "❌ action_points SLA migration failed:",
                error.message
            );

        }

        // ==================================================
        // ACTION POINT NSO MIGRATION
        // ==================================================

        try {

            if (
                typeof ActionPoint.ensureParentColumn ===
                "function"
            ) {

                await ActionPoint.ensureParentColumn();

                console.log(
                    "✅ action_points NSO parent relationship verified"
                );

            }

        } catch (error) {

            console.error(
                "❌ action_points NSO migration failed:",
                error.message
            );

        }

        // ==================================================
        // CHECKLIST SUBMISSION NSO MIGRATION
        // ==================================================

        try {

            if (
                typeof ChecklistSubmission.ensureParentColumn ===
                "function"
            ) {

                await ChecklistSubmission.ensureParentColumn();

                console.log(
                    "✅ checklist_submissions NSO parent relationship verified"
                );

            }

        } catch (error) {

            console.error(
                "❌ checklist_submissions NSO migration failed:",
                error.message
            );

        }

        console.log(
            "=============================================="
        );

        console.log(
            "DATABASE INITIALIZATION COMPLETED"
        );

        console.log(
            "=============================================="
        );

    } catch (error) {

        console.error(
            "❌ DATABASE INITIALIZATION ERROR:",
            error.message
        );

    }

}

SecurityModel.ensureSecuritySchema()
    .then(() => console.log("✅ Security schema verified"))
    .catch((error) => console.error("❌ Security schema initialization failed:", error.message));

initializeDatabase();
startDailyCollectionScheduler();
startMobileLocationScheduler();

// ======================================================
// CORS CONFIGURATION
// ======================================================

const configuredAllowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const allowedOrigins = [

    ...configuredAllowedOrigins,

    // Local Vite
    "http://localhost:5173",

    // Local React
    "http://localhost:3000",

    // Production Vercel
    "https://miarcus.vercel.app",
    "https://rytual.miarcus.com",
    "https://rytual-peach.vercel.app",

    // Environment variable
    process.env.FRONTEND_URL

]
    .filter(Boolean)
    .map((origin) =>
        origin
            .trim()
            .replace(/\/+$/, "")
    );

// ======================================================
// REMOVE DUPLICATES
// ======================================================

const uniqueAllowedOrigins =
    [...new Set(allowedOrigins)];

console.log("");

console.log(
    "=============================================="
);

console.log(
    "CORS CONFIGURATION"
);

console.log(
    "=============================================="
);

uniqueAllowedOrigins.forEach((origin) => {

    console.log(
        "Allowed Origin :",
        origin
    );

});

console.log(
    "=============================================="
);

console.log("");

// ======================================================
// CORS
// ======================================================

app.use(

    cors({

        origin: function (
            origin,
            callback
        ) {

            // ------------------------------------------
            // SERVER TO SERVER / POSTMAN
            // ------------------------------------------

            if (!origin) {

                return callback(
                    null,
                    true
                );

            }

            const normalizedOrigin =
                origin
                    .trim()
                    .replace(/\/+$/, "");

            // ------------------------------------------
            // EXACT ORIGIN
            // ------------------------------------------

            if (
                uniqueAllowedOrigins.includes(
                    normalizedOrigin
                )
            ) {

                return callback(
                    null,
                    true
                );

            }

            // ------------------------------------------
            // VERCEL PREVIEW DEPLOYMENTS
            // ------------------------------------------

            if (

                /^https:\/\/(?:miarcus|rytual)(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(
                    normalizedOrigin
                )

            ) {

                return callback(
                    null,
                    true
                );

            }

            // ------------------------------------------
            // BLOCK UNKNOWN ORIGIN
            // ------------------------------------------

            console.warn(
                "⚠️ CORS BLOCKED ORIGIN:",
                normalizedOrigin
            );

            return callback(

                new Error(
                    `CORS blocked origin: ${normalizedOrigin}`
                )

            );

        },

        // ------------------------------------------
        // HTTP METHODS
        // ------------------------------------------

        methods: [

            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"

        ],

        // ------------------------------------------
        // HEADERS
        // ------------------------------------------

        allowedHeaders: [

            "Origin",
            "X-Requested-With",
            "Content-Type",
            "Accept",
            "Authorization"

        ],

        // ------------------------------------------
        // PREFLIGHT
        // ------------------------------------------

        optionsSuccessStatus: 204,

        // ------------------------------------------
        // JWT IS STORED IN LOCAL STORAGE
        // ------------------------------------------

        credentials: false

    })

);

// ======================================================
// API SECURITY CONTROLS
// ======================================================

app.use("/api", originGuard);
app.use("/api", contentTypeGuard);
app.use("/api", apiLimiter);
app.use("/api", writeLimiter);
app.use("/api", securityAudit);

// ======================================================
// BODY PARSER
// ======================================================

app.use(

    express.json({

        limit: "10mb"

    })

);

app.use(

    express.urlencoded({

        extended: true,

        limit: "10mb"

    })

);

// ======================================================
// REAL-TIME NOTIFICATION EVENT DETECTION
// ======================================================
// Installed before business routes so every successful
// POST/PUT/PATCH/DELETE API action can be converted into a
// persistent MySQL notification without changing each page.
installNotificationEventMiddleware(app);

// Global audit bridge: captures successful create/update/delete actions for
// modules that do not already call activityLogger directly.
installActivityAuditMiddleware(app);

// ======================================================
// UPLOAD DIRECTORY
// ======================================================

const { UPLOAD_DIR: uploadFolder } = require("./config/storage");

// ======================================================
// CREATE UPLOAD DIRECTORY
// ======================================================

if (
    !fs.existsSync(
        uploadFolder
    )
) {

    fs.mkdirSync(

        uploadFolder,

        {
            recursive: true
        }

    );

    console.log(
        "📂 Upload folder created"
    );

}

// ======================================================
// UPLOAD ACCESS
// ======================================================
// Public directory serving is disabled in production by default.
// Existing direct URLs can continue to work locally while the frontend
// migrates to authenticated /api/files/:filename access.

const allowPublicUploads = String(
    process.env.ALLOW_PUBLIC_UPLOADS || (process.env.NODE_ENV === "production" ? "false" : "true")
).toLowerCase() === "true";

if (allowPublicUploads) {
    app.use("/uploads", express.static(uploadFolder, { fallthrough: true, index: false, dotfiles: "deny", redirect: false }));
    app.use("/undefineduploads", express.static(uploadFolder, { fallthrough: true, index: false, dotfiles: "deny", redirect: false }));
    console.warn("⚠️ PUBLIC UPLOAD ACCESS IS ENABLED. Set ALLOW_PUBLIC_UPLOADS=false for production security.");
} else {
    app.get("/uploads/:filename", (req, res) => sendPrivateFile(req, res));
    app.get("/undefineduploads/:filename", (req, res) => sendPrivateFile(req, res));
    console.log("🔒 Public upload access disabled; private file endpoint is active.");
}

app.get("/api/files", sendPrivateFile);
app.get("/api/files/:filename", sendPrivateFile);

console.log("📂 Upload Path:", uploadFolder);

// ======================================================
// PUBLIC IMAGES
// ======================================================

const publicImages =
    path.join(
        __dirname,
        "public",
        "images"
    );

// ======================================================
// CREATE PUBLIC IMAGES DIRECTORY
// ======================================================

if (
    !fs.existsSync(
        publicImages
    )
) {

    fs.mkdirSync(

        publicImages,

        {

            recursive: true

        }

    );

    console.log(
        "📂 Public images folder created"
    );

}

// ======================================================
// SERVE PUBLIC IMAGES
// ======================================================

app.use(

    "/images",

    express.static(

        publicImages,

        {

            fallthrough: true,

            index: false

        }

    )

);

console.log(
    "🖼️ Image Path:",
    publicImages
);

// ======================================================
// HOME API
// ======================================================

app.get(

    "/",

    (req, res) => {

        res.json({

            success: true,

            message:
                "🚀 Miarcus Backend Running",

            requestId: req.requestId

        });

    }

);

// ======================================================
// HEALTH CHECK
// ======================================================

app.get(

    "/api/health",

    (req, res) => {

        res.json({

            success: true,

            server: "running",

            database: "checking",

            timestamp:
                new Date().toISOString()

        });

    }

);

// ======================================================
// UPLOAD TEST
// ======================================================

app.get(

    "/api/upload-test",

    authMiddleware,

    adminOnly,

    (req, res) => {

        res.json({

            success: true,

            message:
                "Upload static route is working",

            uploadPath:
                "/uploads",

            physicalPath:
                uploadFolder,

            maxUploadSize:
                process.env.MAX_UPLOAD_SIZE

        });

    }

);

// ======================================================
// ROUTE STATUS STORAGE
// ======================================================

const loadedRoutes = {};

// ======================================================
// ROUTE LOADER
// ======================================================

const loadRoute = (

    routeFile,

    apiPath,

    routeName

) => {

    try {

        console.log(
            `🔄 Loading ${routeName}...`
        );

        const route =
            require(routeFile);

        if (!route) {

            throw new Error(
                `${routeName} returned an empty router`
            );

        }

        app.use(

            apiPath,

            route

        );

        loadedRoutes[apiPath] = true;

        console.log(
            `✅ ${routeName} Loaded at ${apiPath}`
        );

        return true;

    } catch (error) {

        loadedRoutes[apiPath] = false;

        console.error(
            `❌ ${routeName} FAILED TO LOAD`
        );

        console.error(
            `Route File: ${routeFile}`
        );

        console.error(
            `API Path: ${apiPath}`
        );

        console.error(
            `Error: ${error.message}`
        );

        console.error(
            error.stack
        );

        return false;

    }

};

// ======================================================
// NOTIFICATIONS
// ======================================================

loadRoute(

    "./routes/notificationRoutes",

    "/api/notifications",

    "Notification Routes"

);

loadRoute(

    "./routes/notificationCenterRoutes",

    "/api/notification-center",

    "Notification Center Routes"

);

loadRoute(

    "./routes/chatRoutes",

    "/api/chat",

    "Chat Routes"

);

loadRoute(

    "./routes/collectionTrackingRoutes",

    "/api/collection-tracking",

    "Collection Tracking Routes"

);

// ======================================================
// GALLERY
// ======================================================

const galleryRoutesLoaded = loadRoute(

    "./routes/galleryRoutes",

    "/api/gallery",

    "Gallery Routes"

);

// Never let a failed Gallery module degrade into an opaque generic 404.
// Return a clear 503 so deployment logs and the frontend can distinguish
// a missing route from a temporarily unavailable Gallery dependency.
if (!galleryRoutesLoaded) {

    app.all(

        "/api/gallery{*path}",

        (req, res) => {

            res.status(503).json({
                success: false,
                message: "Gallery API is unavailable because galleryRoutes.js failed to load.",
                route: "/api/gallery",
                routeFile: "./routes/galleryRoutes",
                requestId: req.requestId
            });

        }

    );

}

loadRoute(

    "./routes/locationRoutes",

    "/api/location",

    "Employee Location Routes"

);

const attendanceRoutesLoaded = loadRoute(

    "./routes/attendanceRoutes",

    "/api/attendance",

    "Attendance Routes"

);

// Never turn an Attendance startup/dependency failure into a misleading 404.
// The Attendance router itself is lazy-loaded, so this should remain true in
// normal production deployments. If a future dependency breaks route loading,
// return an explicit 503 that points to the affected API instead.
if (!attendanceRoutesLoaded) {

    app.all(

        "/api/attendance{*path}",

        (req, res) => {

            res.status(503).json({
                success: false,
                message: "Attendance API is unavailable because attendanceRoutes.js failed to load.",
                route: "/api/attendance",
                routeFile: "./routes/attendanceRoutes",
                requestId: req.requestId
            });

        }

    );

}

// ======================================================
// API ROUTES
// ======================================================

// ======================================================
// AUTH
// ======================================================

loadRoute(

    "./routes/authRoutes",

    "/api/auth",

    "Auth Routes"

);

// ======================================================
// STORES
// ======================================================

loadRoute(

    "./routes/storeRoutes",

    "/api/stores",

    "Store Routes"

);

// ======================================================
// ASSET MASTER
// ======================================================

loadRoute(

    "./routes/assetRoutes",

    "/api/assets",

    "Asset Master Routes"

);

// ======================================================
// ACTION POINTS
// ======================================================

loadRoute(

    "./routes/actionpointRoutes",

    "/api/action-points",

    "Action Point Routes"

);

// ======================================================
// ANNOUNCEMENTS
// ======================================================

loadRoute(

    "./routes/announcementRoutes",

    "/api/announcements",

    "Announcement Routes"

);

// ======================================================
// PROFILE
// ======================================================

loadRoute(

    "./routes/profileRoutes",

    "/api/profile",

    "Profile Routes"

);

// ======================================================
// THEME / APPEARANCE PREFERENCES
// ======================================================

loadRoute(

    "./routes/themePreferenceRoutes",

    "/api/theme-preferences",

    "Theme Preference Routes"

);

// ======================================================
// USERS
// ======================================================

loadRoute(

    "./routes/userRoutes",

    "/api/users",

    "User Routes"

);

// ======================================================
// DEPARTMENTS
// ======================================================

loadRoute(

    "./routes/departmentRoutes",

    "/api/departments",

    "Department Routes"

);

// ======================================================
// DESIGNATIONS
// ======================================================

loadRoute(

    "./routes/designationRoutes",

    "/api/designations",

    "Designation Routes"

);

// ======================================================
// CHECKLIST TYPES
// ======================================================

loadRoute(

    "./routes/checklistTypeRoutes",

    "/api/checklist-types",

    "Checklist Type Routes"

);

// ======================================================
// QUESTIONS
// ======================================================

loadRoute(

    "./routes/questionRoutes",

    "/api/questions",

    "Question Routes"

);

// ======================================================
// REPORTS TO
// ======================================================

loadRoute(

    "./routes/reportsToRoutes",

    "/api/reports",

    "Reports To Routes"

);

// ======================================================
// CHECKLIST SUBMISSIONS
// ======================================================

loadRoute(

    "./routes/checklistSubmissionRoutes",

    "/api/checklist-submissions",

    "Checklist Submission Routes"

);

// ======================================================
// CHECKLIST REPORTS
// ======================================================

loadRoute(

    "./routes/checklistReportRoutes",

    "/api/checklist-reports",

    "Checklist Report Routes"

);

// ======================================================
// NSO RULES
// ======================================================

loadRoute(

    "./routes/nsoRuleRoutes",

    "/api/nso-rules",

    "NSO Rule Routes"

);

// ======================================================
// NEW STORE OPENING
// ======================================================

loadRoute(

    "./routes/newStoreOpeningRoutes",

    "/api/new-store-openings",

    "New Store Opening Routes"

);

// ======================================================
// DASHBOARD
// ======================================================

loadRoute(

    "./routes/dashboardRoutes",

    "/api/dashboard",

    "Dashboard Routes"

);

// ======================================================
// ACTIVITY
// ======================================================

loadRoute(

    "./routes/activityRoutes",

    "/api/activities",

    "Activity Routes"

);

// ======================================================
// NSO TRACKING
// ======================================================

loadRoute(

    "./routes/nsoTrackingRoutes",

    "/api/nso-tracking",

    "NSO Tracking Routes"

);

// ======================================================
// EXPENSES
// ======================================================

loadRoute(

    "./routes/expenseRoutes",

    "/api/expenses",

    "Expense Routes"

);

// ======================================================
// PETTY CASH
// ======================================================

loadRoute(

    "./routes/pettyCashRoutes",

    "/api/petty-cash",

    "Petty Cash Routes"

);

// ======================================================
// BILLING
// ======================================================

loadRoute(

    "./routes/dailyCollectionRoutes",

    "/api/daily-collection",

    "Daily Collection Routes"

);

loadRoute(

    "./routes/billingRoutes",

    "/api/billing",

    "Billing Routes"

);

// ======================================================
// SALES TEAM
// ======================================================

loadRoute(
    "./routes/salesTeamRoutes",
    "/api/sales-team",
    "Sales Team Routes"
);

// ======================================================
// LISTING TRACKER
// ======================================================

loadRoute(

    "./routes/listingTrackerRoutes",

    "/api/listing-tracker",

    "Listing Tracker Routes"

);

// ======================================================
// INVENTORY PLANNING
// ======================================================

loadRoute(
    "./routes/inventoryPlanningRoutes",
    "/api/inventory-planning",
    "Inventory Planning Routes"
);

// ======================================================
// QUIZ ROUTE TEST
// ======================================================
//
// IMPORTANT:
//
// This route MUST be before /api/quiz.
//
// quizRoutes.js contains dynamic routes such as:
//
//     /:id
//
// Therefore:
//
//     /api/quiz/route-test
//
// must be registered here first.
//
// ======================================================

app.get(

    "/api/quiz/route-test",

    (req, res) => {

        res.status(200).json({

            success: true,

            message:
                "Quiz API route is mounted",

            path:
                "/api/quiz",

            serverTime:
                new Date().toISOString()

        });

    }

);

// ======================================================
// QUIZ ROUTE STATUS
// ======================================================
//
// IMPORTANT:
//
// This MUST also be registered BEFORE /api/quiz.
//
// Otherwise:
//
//     /api/quiz/status
//
// can be caught by:
//
//     quizRoutes.js -> /:id
//
// ======================================================

let quizRoutesLoaded = false;

app.get(

    "/api/quiz/status",

    (req, res) => {

        res.status(200).json({

            success: true,

            quizRoutesLoaded:

                quizRoutesLoaded,

            route:

                "/api/quiz",

            routeFile:

                "./routes/quizRoutes"

        });

    }

);

// ======================================================
// QUIZ
// ======================================================
//
// IMPORTANT:
//
// This is the actual Quiz API mount.
//
// Frontend:
//
//     /api/quiz
//
// maps to:
//
//     ./routes/quizRoutes
//
// ======================================================

quizRoutesLoaded =
    loadRoute(

        "./routes/quizRoutes",

        "/api/quiz",

        "Quiz Routes"

    );

// ======================================================
// QUIZ ROUTE LOAD FAILURE CHECK
// ======================================================
//
// If quizRoutes.js fails to load, do NOT silently return
// the generic 404 response.
//
// Return 503 with a clear message.
//
// The backend console above will contain the exact
// require/controller/router error.
//
// ======================================================

if (!quizRoutesLoaded) {

    app.all(

        "/api/quiz",

        (req, res) => {

            res.status(503).json({

                success: false,

                message:
                    "Quiz API is unavailable because quizRoutes.js failed to load.",

                route:
                    "/api/quiz",

                routeFile:
                    "./routes/quizRoutes"

            });

        }

    );

}

// ======================================================
// GENERAL TEST API
// ======================================================

app.get(

    "/api/test",

    authMiddleware,

    adminOnly,

    (req, res) => {

        res.json({

            success: true,

            message:
                "API Working"

        });

    }

);

// ======================================================
// ALL ROUTES STATUS
// ======================================================

app.get(

    "/api/routes/status",

    authMiddleware,

    adminOnly,

    (req, res) => {

        res.json({

            success: true,

            routes:
                loadedRoutes

        });

    }

);

// ======================================================
// MULTER / UPLOAD ERROR HANDLER
// ======================================================

app.use(

    (err, req, res, next) => {

        console.error(
            "❌ REQUEST / UPLOAD ERROR:",
            err
        );

        // ------------------------------------------
        // FILE SIZE
        // ------------------------------------------

        if (

            err &&

            err.code ===
                "LIMIT_FILE_SIZE"

        ) {

            return res

                .status(400)

                .json({

                    success: false,

                    message:
                        "The uploaded file is larger than the server upload limit.",

                    code:
                        "LIMIT_FILE_SIZE",

                    configuredLimit:
                        process.env.MAX_UPLOAD_SIZE

                });

        }

        // ------------------------------------------
        // FILE COUNT
        // ------------------------------------------

        if (

            err &&

            err.code ===
                "LIMIT_FILE_COUNT"

        ) {

            return res

                .status(400)

                .json({

                    success: false,

                    message:
                        "Too many files were uploaded.",

                    code:
                        "LIMIT_FILE_COUNT"

                });

        }

        // ------------------------------------------
        // UNEXPECTED FILE
        // ------------------------------------------

        if (

            err &&

            err.code ===
                "LIMIT_UNEXPECTED_FILE"

        ) {

            return res

                .status(400)

                .json({

                    success: false,

                    message:
                        "Unexpected upload field.",

                    code:
                        "LIMIT_UNEXPECTED_FILE"

                });

        }

        // ------------------------------------------
        // MULTER ERROR
        // ------------------------------------------

        if (

            err &&

            err.name ===
                "MulterError"

        ) {

            return res

                .status(400)

                .json({

                    success: false,

                    message:
                        err.message ||
                        "File upload failed.",

                    code:
                        err.code ||
                        "MULTER_ERROR"

                });

        }

        // ------------------------------------------
        // CORS ERROR
        // ------------------------------------------

        if (

            err &&

            typeof err.message ===
                "string" &&

            err.message.startsWith(
                "CORS blocked origin:"
            )

        ) {

            return res

                .status(403)

                .json({

                    success: false,

                    message:
                        err.message

                });

        }

        // ------------------------------------------
        // NORMAL ERROR
        // ------------------------------------------

        if (

            err &&

            err.message

        ) {

            return res

                .status(400)

                .json({

                    success: false,

                    message:
                        err.message

                });

        }

        next(err);

    }

);

// ======================================================
// 404 HANDLER
// ======================================================

app.use(

    (req, res) => {

        console.warn(

            "⚠️ API Route Not Found:",

            req.method,

            req.originalUrl

        );

        res

            .status(404)

            .json({

                success: false,

                message:
                    "API Route Not Found",

                requestId: req.requestId

            });

    }

);

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(

    (err, req, res, next) => {

        console.error(
            "❌ SERVER ERROR:",
            err
        );

        res

            .status(500)

            .json({

                success: false,

                message:
                    err?.type === "entity.too.large" || err?.status === 413
                        ? "Request body is too large."
                        : "Internal Server Error",

                requestId: req.requestId

            });

    }

);

// ======================================================
// SERVER START
// ======================================================

const PORT =
    process.env.PORT ||
    5000;

// ======================================================
// LISTEN
// ======================================================

const httpServer = app.listen(

    PORT,

    "0.0.0.0",

    () => {

        console.log(
            "================================"
        );

        console.log(
            "🚀 MIARCUS BACKEND STARTED"
        );

        console.log(
            `🚀 Server Running : http://localhost:${PORT}`
        );

        console.log(
            `📂 Upload URL : http://localhost:${PORT}/uploads`
        );

        console.log(
            `🖼️ Images URL : http://localhost:${PORT}/images`
        );

        console.log(
            `🧪 Quiz Route Test : http://localhost:${PORT}/api/quiz/route-test`
        );

        console.log(
            `🧪 Quiz Status : http://localhost:${PORT}/api/quiz/status`
        );

        console.log(
            `🧪 Routes Status : http://localhost:${PORT}/api/routes/status`
        );

        console.log(
            "📦 Maximum configured upload size :",
            process.env.MAX_UPLOAD_SIZE,
            "bytes"
        );

        console.log(
            "================================"
        );

        // --------------------------------------------------
        // Verify Resend configuration at startup.
        // --------------------------------------------------
        verifyMailer()
            .then((ok) => {
                if (!ok) {
                    console.error(
                        "⚠️ MIARCUS EMAIL SERVICE IS NOT READY. Check RESEND_API_KEY and RESEND_FROM in Render Environment."
                    );
                }
            })
            .catch((error) => {
                console.error(
                    "⚠️ MIARCUS EMAIL SERVICE HEALTH CHECK FAILED:",
                    error?.message || error
                );
            });

    }

);

// Reasonable HTTP parser timeouts reduce slow-header/slowloris exposure.
httpServer.keepAliveTimeout = 5000;
httpServer.headersTimeout = 65000;
httpServer.requestTimeout = 120000;