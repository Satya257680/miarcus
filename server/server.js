// ======================================================
// MIARCUS BACKEND SERVER
// ======================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");


// ======================================================
// UPLOAD CONFIGURATION
// ======================================================
//
// IMPORTANT:
// upload.js should read process.env.MAX_UPLOAD_SIZE.
//
// Example:
// MAX_UPLOAD_SIZE=2147483648
//
// 2147483648 = 2 GB
//
// This is intentionally very large so normal PDF,
// image and document uploads are not blocked at 10 MB.
//
// ======================================================

process.env.MAX_UPLOAD_SIZE =
    process.env.MAX_UPLOAD_SIZE ||
    String(2 * 1024 * 1024 * 1024);


// ======================================================
// APP
// ======================================================

const app = express();


// ======================================================
// PROCESS-LEVEL SAFETY NET
// ======================================================

process.on(
    "unhandledRejection",
    (reason) => {

        console.error(
            "================================"
        );

        console.error(
            "🛑 UNHANDLED PROMISE REJECTION"
        );

        console.error(
            "================================"
        );

        console.error(reason);

        console.error(
            "================================"
        );

    }
);


process.on(
    "uncaughtException",
    (err) => {

        console.error(
            "================================"
        );

        console.error(
            "🛑 UNCAUGHT EXCEPTION"
        );

        console.error(
            "================================"
        );

        console.error(err);

        console.error(
            "================================"
        );

    }
);


// ======================================================
// DATABASE
// ======================================================

const db = require("./config/db");


// ======================================================
// TABLE INITIALIZATION
// ======================================================

const ActionPoint =
    require("./models/actionPointModel");

const ChecklistSubmission =
    require("./models/checklistSubmissionModel");

const Announcement =
    require("./models/announcementModel");


// ======================================================
// CREATE TABLE HELPER
// ======================================================

function createTablesAsync(
    model,
    label
) {

    return new Promise(
        (resolve) => {

            model.createTables(
                (err) => {

                    if (err) {

                        console.error(
                            `❌ Failed to create/verify ${label} table(s):`,
                            err.message
                        );

                    }
                    else {

                        console.log(
                            `✅ ${label} table(s) verified`
                        );

                    }

                    resolve();

                }
            );

        }
    );

}


// ======================================================
// DATABASE INITIALIZATION
// ======================================================

async function initializeDatabase() {

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


    await createTablesAsync(
        ActionPoint,
        "action_points"
    );


    await createTablesAsync(
        ChecklistSubmission,
        "checklist_submissions"
    );


    await createTablesAsync(
        Announcement,
        "announcements"
    );


    // ==================================================
    // ACTION POINT NSO MIGRATION
    // ==================================================

    try {

        await ActionPoint.ensureParentColumn();

        console.log(
            "✅ action_points NSO parent relationship verified"
        );

    }
    catch (error) {

        console.error(
            "❌ action_points NSO migration failed:",
            error.message
        );

    }


    // ==================================================
    // CHECKLIST SUBMISSION NSO MIGRATION
    // ==================================================

    try {

        await ChecklistSubmission.ensureParentColumn();

        console.log(
            "✅ checklist_submissions NSO parent relationship verified"
        );

    }
    catch (error) {

        console.error(
            "❌ checklist_submissions NSO migration failed:",
            error.message
        );

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
    .map(
        (origin) =>
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


uniqueAllowedOrigins.forEach(
    (origin) => {

        console.log(
            "Allowed Origin :",
            origin
        );

    }
);


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

                /^https:\/\/miarcus(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(
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
// BODY PARSER
// ======================================================
//
// These are NOT Multer limits.
// They control JSON / URL encoded requests.
//
// Large values prevent unnecessary request-body
// rejection for normal API operations.
//
// ======================================================

app.use(

    express.json({

        limit: "2gb"

    })

);


app.use(

    express.urlencoded({

        extended: true,

        limit: "2gb"

    })

);


// ======================================================
// UPLOAD DIRECTORY
// ======================================================

const uploadFolder =
    path.join(
        __dirname,
        "uploads"
    );


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
// SERVE UPLOADED FILES
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
// BACKWARD COMPATIBILITY
// ======================================================
//
// Old URLs such as:
//
// /undefineduploads/file.pdf
//
// will continue working.
//
// Correct URL:
//
// /uploads/file.pdf
//
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
                uploadFolder,

            maxUploadSize:
                process.env.MAX_UPLOAD_SIZE

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

        const route =
            require(routeFile);


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
// ANNOUNCEMENTS
// ------------------------------------------------------

loadRoute(

    "./routes/announcementRoutes",

    "/api/announcements",

    "Announcement Routes"

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
            "❌ REQUEST / UPLOAD ERROR:",
            err
        );


        // ------------------------------------------
        // MULTER FILE SIZE ERROR
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
        // MULTER FILE COUNT ERROR
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
        // MULTER FIELD ERROR
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
        // CUSTOM MULTER ERROR
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


        res
            .status(500)
            .json({

                success: false,

                message:
                    err &&
                    err.message
                        ? err.message
                        : "Internal Server Error"

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
            "📦 Maximum configured upload size :",
            process.env.MAX_UPLOAD_SIZE,
            "bytes"
        );


        console.log(
            "================================"
        );

    }

);