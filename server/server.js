// ======================================================
// MIARCUS BACKEND SERVER
// ======================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// ======================================================
// APP
// ======================================================

const app = express();


// ======================================================
// PROCESS-LEVEL SAFETY NET
// ======================================================
//
// Defense in depth: even with db.js's callback/promise bridge
// fixed, some future bug (a bad query, a missing table, a typo)
// could still throw an unhandled error somewhere. Without these
// handlers, Node's default behavior is to crash the ENTIRE
// server on any unhandled rejection or exception — exactly what
// happened when the 'users' table was missing. Log loudly
// instead of dying, so one bad request can't take down every
// other user's session.
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

// ------------------------------------------------------
// db.js exports { pool, query, execute, getConnection,
// testDatabaseConnection, connectWithRetry, closePool } —
// not the pool itself. connectWithRetry() runs the built-in
// ping + test-query check, and retries with backoff if the
// handshake gets reset (common on flaky networks / antivirus
// TLS inspection / a free-tier Aiven service waking up).
// ------------------------------------------------------

// ------------------------------------------------------
// TABLE INITIALIZATION
// ------------------------------------------------------
// Some models (ActionPoint, ChecklistSubmission) ship a
// `createTables()` helper that runs `CREATE TABLE IF NOT
// EXISTS`, but nothing ever called it — the tables only
// existed if someone created them by hand in Aiven. That's
// why /api/action-points was throwing a 500: the table
// simply wasn't there. connectWithRetry() now runs first,
// then we create/verify the tables it depends on before the
// server starts accepting traffic.
// ------------------------------------------------------

const ActionPoint = require("./models/actionPointModel");
const ChecklistSubmission = require("./models/checklistSubmissionModel");

function createTablesAsync(model, label) {
    return new Promise((resolve) => {
        model.createTables((err) => {
            if (err) {
                console.error(`❌ Failed to create/verify ${label} table(s):`, err.message);
            } else {
                console.log(`✅ ${label} table(s) verified`);
            }
            // Resolve either way — a table-creation failure shouldn't
            // block the whole server from starting, it'll just keep
            // producing the same clear error on affected endpoints.
            resolve();
        });
    });
}

async function initializeDatabase() {

    const connected = await db.connectWithRetry();

    if (!connected) {
        console.error("🛑 Skipping table initialization — no database connection.");
        return;
    }

    console.log("");
    console.log("==============================================");
    console.log("VERIFYING / CREATING REQUIRED TABLES");
    console.log("==============================================");

    await createTablesAsync(ActionPoint, "action_points");
    await createTablesAsync(ChecklistSubmission, "checklist_submissions");

    // Existing databases need explicit migrations because CREATE TABLE IF NOT EXISTS
    // does not modify an already-created table.
    try {
        await ActionPoint.ensureParentColumn();
        console.log("✅ action_points NSO parent relationship verified");
    } catch (error) {
        console.error("❌ action_points NSO migration failed:", error.message);
    }

    try {
        await ChecklistSubmission.ensureParentColumn();
        console.log("✅ checklist_submissions NSO parent relationship verified");
    } catch (error) {
        console.error("❌ checklist_submissions NSO migration failed:", error.message);
    }
}

initializeDatabase();


// ======================================================
// CORS CONFIGURATION
// ======================================================

const allowedOrigins = [
    // Local Vite
    "http://localhost:5173",

    // Local React
    "http://localhost:3000",

    // Production Vercel
    "https://miarcus.vercel.app",

    // Environment variable
    process.env.FRONTEND_URL
]
    .filter(Boolean)
    .map((origin) =>
        origin.trim().replace(/\/+$/, "")
    );

// Remove duplicates
const uniqueAllowedOrigins =
    [...new Set(allowedOrigins)];

console.log("");
console.log("==============================================");
console.log("CORS CONFIGURATION");
console.log("==============================================");

uniqueAllowedOrigins.forEach((origin) => {
    console.log("Allowed Origin :", origin);
});

console.log("==============================================");
console.log("");

app.use(
    cors({

        origin: function (origin, callback) {

            // --------------------------------------------------
            // SERVER-TO-SERVER / POSTMAN
            // --------------------------------------------------

            if (!origin) {
                return callback(null, true);
            }

            const normalizedOrigin =
                origin
                    .trim()
                    .replace(/\/+$/, "");

            // --------------------------------------------------
            // EXACT ORIGIN
            // --------------------------------------------------

            if (
                uniqueAllowedOrigins.includes(
                    normalizedOrigin
                )
            ) {
                return callback(null, true);
            }

            // --------------------------------------------------
            // VERCEL PREVIEW DEPLOYMENTS
            // --------------------------------------------------
            //
            // Example:
            // https://miarcus-git-main-xxxx.vercel.app
            //
            // Allow only Vercel deployments belonging to
            // the Miarcus project naming pattern.
            // --------------------------------------------------

            if (
                /^https:\/\/miarcus(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(
                    normalizedOrigin
                )
            ) {
                return callback(null, true);
            }

            // --------------------------------------------------
            // BLOCK UNKNOWN ORIGIN
            // --------------------------------------------------

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

        // --------------------------------------------------
        // HTTP METHODS
        // --------------------------------------------------

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],

        // --------------------------------------------------
        // HEADERS
        // --------------------------------------------------

        allowedHeaders: [
            "Origin",
            "X-Requested-With",
            "Content-Type",
            "Accept",
            "Authorization"
        ],

        // --------------------------------------------------
        // PREFLIGHT
        // --------------------------------------------------

        optionsSuccessStatus: 204,

        // --------------------------------------------------
        // JWT IS STORED IN LOCAL STORAGE
        // SO COOKIES ARE NOT REQUIRED
        // --------------------------------------------------

        credentials: false
    })
);


// ======================================================
// BODY PARSER
// ======================================================

app.use(

    express.json({

        limit: "20mb"

    })

);


app.use(

    express.urlencoded({

        extended: true,

        limit: "20mb"

    })

);


// ======================================================
// UPLOAD DIRECTORY
// ======================================================

const uploadFolder = path.join(

    __dirname,

    "uploads"

);


// ======================================================
// CREATE UPLOAD DIRECTORY
// ======================================================

if (
    !fs.existsSync(uploadFolder)
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
// SERVE UPLOADED FILES
// ======================================================
//
// Correct URL:
//
// https://miarcus-backend.onrender.com/uploads/filename.pdf
//
// Production:
//
// https://your-backend.onrender.com/uploads/filename.pdf
//
// ======================================================

app.use(

    "/uploads",

    express.static(

        uploadFolder,

        {

            fallthrough: true,

            index: false

        }

    )

);


console.log(
    "📂 Upload Path:",
    uploadFolder
);


// ======================================================
// BACKWARD COMPATIBILITY FOR OLD ATTACHMENT URLs
// ======================================================
//
// Your screenshot showed:
//
// /undefineduploads/filename.pdf
//
// This is NOT the correct URL.
//
// The correct URL is:
//
// /uploads/filename.pdf
//
// However, this compatibility route allows old
// attachment URLs to continue working temporarily.
//
// After the frontend is fixed, this can be removed.
// ======================================================

app.use(

    "/undefineduploads",

    express.static(

        uploadFolder,

        {

            fallthrough: true,

            index: false

        }

    )

);


console.log(
    "📂 Legacy Upload URL Enabled: /undefineduploads"
);


// ======================================================
// PUBLIC IMAGES
// ======================================================

const publicImages = path.join(

    __dirname,

    "public",

    "images"

);


// Create public/images if it does not exist.

if (
    !fs.existsSync(publicImages)
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


// Serve public images.

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

            environment:
                process.env.NODE_ENV ||
                "development"

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
//
// Open:
//
// https://miarcus-backend.onrender.com/uploads
//
// This confirms the static upload route exists.
// ======================================================

app.get(

    "/api/upload-test",

    (req, res) => {

        res.json({

            success: true,

            message:
                "Upload static route is working",

            uploadPath:
                "/uploads",

            physicalPath:
                uploadFolder

        });

    }

);


// ======================================================
// ROUTE LOADER
// ======================================================

const loadRoute = (

    routeFile,

    apiPath,

    routeName

) => {

    try {

        const route = require(
            routeFile
        );


        app.use(

            apiPath,

            route

        );


        console.log(

            `✅ ${routeName} Loaded`

        );


    }

    catch (error) {

        console.error(

            `❌ ${routeName} Failed`

        );


        console.error(
            error.message
        );


        console.error(
            error.stack
        );

    }

};


// ======================================================
// API ROUTES
// ======================================================


// ------------------------------------------------------
// AUTH
// ------------------------------------------------------

loadRoute(

    "./routes/authRoutes",

    "/api/auth",

    "Auth Routes"

);


// ------------------------------------------------------
// STORES
// ------------------------------------------------------

loadRoute(

    "./routes/storeRoutes",

    "/api/stores",

    "Store Routes"

);


// ------------------------------------------------------
// ACTION POINTS
// ------------------------------------------------------

loadRoute(

    "./routes/actionpointRoutes",

    "/api/action-points",

    "Action Point Routes"

);


// ------------------------------------------------------
// PROFILE
// ------------------------------------------------------

loadRoute(

    "./routes/profileRoutes",

    "/api/profile",

    "Profile Routes"

);


// ------------------------------------------------------
// USERS
// ------------------------------------------------------

loadRoute(

    "./routes/userRoutes",

    "/api/users",

    "User Routes"

);


// ------------------------------------------------------
// DEPARTMENTS
// ------------------------------------------------------

loadRoute(

    "./routes/departmentRoutes",

    "/api/departments",

    "Department Routes"

);


// ------------------------------------------------------
// DESIGNATIONS
// ------------------------------------------------------

loadRoute(

    "./routes/designationRoutes",

    "/api/designations",

    "Designation Routes"

);


// ------------------------------------------------------
// CHECKLIST TYPES
// ------------------------------------------------------

loadRoute(

    "./routes/checklistTypeRoutes",

    "/api/checklist-types",

    "Checklist Type Routes"

);


// ------------------------------------------------------
// QUESTIONS
// ------------------------------------------------------

loadRoute(

    "./routes/questionRoutes",

    "/api/questions",

    "Question Routes"

);


// ------------------------------------------------------
// REPORTS TO
// ------------------------------------------------------

loadRoute(

    "./routes/reportsToRoutes",

    "/api/reports",

    "Reports To Routes"

);


// ------------------------------------------------------
// CHECKLIST SUBMISSIONS
// ------------------------------------------------------

loadRoute(

    "./routes/checklistSubmissionRoutes",

    "/api/checklist-submissions",

    "Checklist Submission Routes"

);


// ------------------------------------------------------
// CHECKLIST REPORTS
// ------------------------------------------------------

loadRoute(

    "./routes/checklistReportRoutes",

    "/api/checklist-reports",

    "Checklist Report Routes"

);


// ------------------------------------------------------
// NSO RULES
// ------------------------------------------------------

loadRoute(

    "./routes/nsoRuleRoutes",

    "/api/nso-rules",

    "NSO Rule Routes"

);


// ------------------------------------------------------
// NEW STORE OPENING
// ------------------------------------------------------

loadRoute(

    "./routes/newStoreOpeningRoutes",

    "/api/new-store-openings",

    "New Store Opening Routes"

);


// ------------------------------------------------------
// DASHBOARD
// ------------------------------------------------------

loadRoute(

    "./routes/dashboardRoutes",

    "/api/dashboard",

    "Dashboard Routes"

);


// ------------------------------------------------------
// ACTIVITY
// ------------------------------------------------------

loadRoute(

    "./routes/activityRoutes",

    "/api/activities",

    "Activity Routes"

);


// ------------------------------------------------------
// NSO TRACKING
// ------------------------------------------------------

loadRoute(

    "./routes/nsoTrackingRoutes",

    "/api/nso-tracking",

    "NSO Tracking Routes"

);


// ======================================================
// TEST API
// ======================================================

app.get(

    "/api/test",

    (req, res) => {

        res.json({

            success: true,

            message:
                "API Working"

        });

    }

);


// ======================================================
// MULTER / UPLOAD ERROR HANDLER
// ======================================================

app.use(

    (err, req, res, next) => {

        console.error(
            "❌ UPLOAD ERROR:",
            err
        );


        // File too large.

        if (
            err.code ===
            "LIMIT_FILE_SIZE"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Maximum file size allowed is 10MB"

            });

        }


        // Multer / custom upload error.

        if (
            err.message
        ) {

            return res.status(400).json({

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


        res.status(404).json({

            success: false,

            message:
                "API Route Not Found",

            path:
                req.originalUrl

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


        res.status(500).json({

            success: false,

            message:
                err.message ||
                "Internal Server Error"

        });

    }

);


// ======================================================
// SERVER START
// ======================================================

const PORT =
    process.env.PORT || 5000;


// ======================================================
// LISTEN
// ======================================================

app.listen(

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
            "================================"
        );

    }

);