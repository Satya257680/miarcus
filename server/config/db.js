// ============================================================
// MIARCUS - MYSQL DATABASE CONFIGURATION
// Aiven MySQL + mysql2/promise
// ============================================================

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================

const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME || "defaultdb";

// ============================================================
// VALIDATE ENVIRONMENT
// ============================================================

if (!DB_HOST) {
    throw new Error("DB_HOST is missing in .env");
}

if (!DB_USER) {
    throw new Error("DB_USER is missing in .env");
}

if (!DB_PASSWORD) {
    throw new Error("DB_PASSWORD is missing in .env");
}

// ============================================================
// AIVEN CA CERTIFICATE
// ============================================================

const CA_CERT_PATH = path.resolve(
    __dirname,
    "..",
    "certs",
    "ca.pem"
);

let caCertificate = null;

if (fs.existsSync(CA_CERT_PATH)) {
    caCertificate = fs.readFileSync(CA_CERT_PATH, "utf8");
    console.log("🔐 Aiven CA certificate loaded:", CA_CERT_PATH);
} else if (String(process.env.NODE_ENV || "development").toLowerCase() === "production") {
    throw new Error(`FATAL: Aiven CA certificate is required in production: ${CA_CERT_PATH}`);
} else {
    console.warn("⚠️ Aiven CA certificate NOT FOUND; local development only.");
}

// ============================================================
// DATABASE CONFIGURATION
// ============================================================

const dbConfig = {
    host: DB_HOST,

    port: DB_PORT,

    user: DB_USER,

    password: DB_PASSWORD,

    database: DB_NAME,

    // --------------------------------------------------------
    // CONNECTION
    // --------------------------------------------------------

    waitForConnections: true,

    connectionLimit: 10,

    maxIdle: 10,

    idleTimeout: 60000,

    queueLimit: 0,

    enableKeepAlive: true,

    keepAliveInitialDelay: 0,

    // --------------------------------------------------------
    // CONNECTION TIMEOUT
    // --------------------------------------------------------

    connectTimeout: 30000,

    // --------------------------------------------------------
    // SSL / TLS
    // --------------------------------------------------------

    multipleStatements: false,

    ssl: {
        ...(caCertificate ? { ca: caCertificate } : {}),
        rejectUnauthorized: Boolean(caCertificate),
        minVersion: "TLSv1.2",
        servername: DB_HOST
    }
};

// ============================================================
// DISPLAY CONFIGURATION
// ============================================================

console.log("");
console.log("============================================================");
console.log("              MIARCUS DATABASE CONFIGURATION");
console.log("============================================================");

console.log("Provider       : Aiven");
console.log("Host           :", DB_HOST);
console.log("Port           :", DB_PORT);
console.log("Database       :", DB_NAME);
console.log("User           :", DB_USER);
console.log(
    "Password       :",
    DB_PASSWORD ? "********" : "NOT SET"
);

console.log(
    "SSL            :",
    dbConfig.ssl ? "ENABLED" : "DISABLED"
);

console.log(
    "SSL Verify     :",
    dbConfig.ssl?.rejectUnauthorized
        ? "ENABLED"
        : "DISABLED"
);

console.log(
    "CA Certificate :",
    caCertificate ? "LOADED" : "NOT LOADED"
);

console.log("Pool           : 10");
console.log("Timeout        : 30000");
console.log("IPv4           : FORCED");
console.log("TLS            : 1.2+");

console.log("============================================================");
console.log("");

// ============================================================
// CREATE MYSQL POOL
// ============================================================

const pool = mysql.createPool(dbConfig);

// ------------------------------------------------------------
// POOL-LEVEL ERROR HANDLER
// ------------------------------------------------------------
// Without this, an idle connection that gets reset by the
// network (exactly the ECONNRESET/HANDSHAKE_SSL_ERROR pattern
// we've been seeing) can crash the whole process with an
// unhandled 'error' event. The pool itself will transparently
// open a new connection on the next query, so we just log here.
// ------------------------------------------------------------

pool.on("error", (err) => {

    console.error("");
    console.error("⚠️ MYSQL POOL ERROR (non-fatal, pool will reconnect):");
    console.error("Code    :", err.code);
    console.error("Message :", err.message);
    console.error("");

});

// ============================================================
// QUERY (dual-mode: supports both callback-style and
// async/await usage)
// ============================================================
//
// Much of this codebase's controllers were written for the old
// callback-style mysql2 API:
//
//   db.query(sql, params, (err, result) => { ... })
//
// The promise-based mysql2/promise pool has NO callback support
// at all — pool.query(sql, params) only returns a Promise. If a
// callback is passed as a 3rd argument, plain promise-based code
// silently ignores it, the returned Promise is never awaited or
// caught, and any query error becomes an UNHANDLED PROMISE
// REJECTION that can crash the entire Node process.
//
// To avoid rewriting every controller, this wrapper detects a
// callback argument and bridges old-style calls onto the
// promise pool safely, while still supporting:
//
//   const rows = await db.query(sql, params);
//
// for any newer async/await code.
// ============================================================

function query(sql, params = [], callback) {

    // Support db.query(sql, callback) with no params array
    if (typeof params === "function") {
        callback = params;
        params = [];
    }

    const resultPromise = pool
        .query(sql, params)
        .then(([rows]) => rows);

    if (typeof callback === "function") {

        resultPromise
            .then((rows) => callback(null, rows))
            .catch((err) => callback(err));

        return undefined;
    }

    return resultPromise;
}

// ============================================================
// EXECUTE (same dual-mode support as query)
// ============================================================

function execute(sql, params = [], callback) {

    if (typeof params === "function") {
        callback = params;
        params = [];
    }

    const resultPromise = pool
        .execute(sql, params)
        .then(([rows]) => rows);

    if (typeof callback === "function") {

        resultPromise
            .then((rows) => callback(null, rows))
            .catch((err) => callback(err));

        return undefined;
    }

    return resultPromise;
}

// ============================================================
// GET CONNECTION
// ============================================================

async function getConnection() {
    return pool.getConnection();
}

// ============================================================
// TEST DATABASE CONNECTION (single attempt)
// ============================================================

async function testDatabaseConnection() {

    let connection = null;

    try {

        console.log("");
        console.log(
            "============================================================"
        );

        console.log(
            "             TESTING MYSQL DATABASE CONNECTION"
        );

        console.log(
            "============================================================"
        );

        console.log("Host     :", DB_HOST);
        console.log("Port     :", DB_PORT);
        console.log("Database :", DB_NAME);
        console.log("User     :", DB_USER);
        console.log(
            "SSL      :",
            caCertificate
                ? "ENABLED + CA"
                : "ENABLED WITHOUT CA"
        );

        console.log("");

        connection = await pool.getConnection();

        console.log("🔌 MySQL connection acquired");

        await connection.ping();

        console.log("🏓 MySQL ping successful");

        const [rows] = await connection.query(
            "SELECT 1 AS test"
        );

        console.log(
            "🧪 Test query result:",
            rows
        );

        console.log("");
        console.log("✅ MYSQL CONNECTION SUCCESSFUL");
        console.log("");

        return true;

    } catch (error) {

        console.log("");
        console.log(
            "============================================================"
        );

        console.error(
            "❌ MYSQL CONNECTION FAILED"
        );

        console.log(
            "============================================================"
        );

        console.error(
            "Host      :",
            DB_HOST
        );

        console.error(
            "Port      :",
            DB_PORT
        );

        console.error(
            "Database  :",
            DB_NAME
        );

        console.error(
            "User      :",
            DB_USER
        );

        console.error(
            "Error Code:",
            error.code
        );

        console.error(
            "Errno     :",
            error.errno
        );

        console.error(
            "SQL State :",
            error.sqlState
        );

        console.error(
            "Message   :",
            error.message
        );

        console.error("");

        if (error.code === "HANDSHAKE_SSL_ERROR") {

            console.error(
                "⚠️ SSL/TLS handshake failed."
            );

            console.error(
                "Check Aiven host/port, CA certificate,",
            );

            console.error(
                "network access and Aiven service status."
            );
        }

        console.log(
            "============================================================"
        );

        console.log("");

        return false;

    } finally {

        if (connection) {
            connection.release();
        }
    }
}

// ============================================================
// TEST DATABASE CONNECTION WITH RETRY + BACKOFF
// ============================================================
// Handshake resets caused by a flaky network path, antivirus
// TLS inspection, or a still-waking-up Aiven free-tier service
// are often transient. Instead of giving up after one failed
// attempt at startup, retry a few times with increasing delay
// before finally logging a hard failure.
// ============================================================

async function connectWithRetry(
    maxAttempts = 5,
    initialDelayMs = 2000
) {

    let attempt = 0;
    let delay = initialDelayMs;

    while (attempt < maxAttempts) {

        attempt++;

        console.log(
            `🔁 MySQL connection attempt ${attempt}/${maxAttempts}...`
        );

        const success = await testDatabaseConnection();

        if (success) {
            return true;
        }

        if (attempt < maxAttempts) {

            console.log(
                `⏳ Retrying in ${delay / 1000}s...`
            );

            await new Promise((resolve) => {
                setTimeout(resolve, delay);
            });

            // Exponential backoff, capped at 20s
            delay = Math.min(delay * 2, 20000);
        }
    }

    console.error("");
    console.error(
        "🛑 MySQL connection failed after all retry attempts."
    );
    console.error(
        "Server will keep running so HTTP routes stay up,"
    );
    console.error(
        "but database-dependent routes will fail until this is resolved."
    );
    console.error("");

    return false;
}

// ============================================================
// CLOSE POOL
// ============================================================

async function closePool() {

    try {

        console.log(
            "🔒 Closing MySQL connection pool..."
        );

        await pool.end();

        console.log(
            "✅ MySQL connection pool closed"
        );

    } catch (error) {

        console.error(
            "❌ Error closing MySQL pool:",
            error.message
        );
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    pool,
    query,
    execute,
    getConnection,
    testDatabaseConnection,
    connectWithRetry,
    closePool
};