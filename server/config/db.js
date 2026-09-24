// ============================================================
// MIARCUS - MYSQL DATABASE CONFIGURATION
// mysql2/promise
// Supports local/company MySQL and SSL-enabled MySQL
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

const DB_SSL =
    String(process.env.DB_SSL || "false").toLowerCase() === "true";

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
// CA CERTIFICATE
// Only used when DB_SSL=true
// ============================================================

const CA_CERT_PATH = path.resolve(
    __dirname,
    "..",
    "certs",
    "ca.pem"
);

let caCertificate = null;

if (DB_SSL) {
    if (fs.existsSync(CA_CERT_PATH)) {
        caCertificate = fs.readFileSync(CA_CERT_PATH, "utf8");

        console.log(
            "🔐 CA certificate loaded:",
            CA_CERT_PATH
        );
    } else {
        console.warn(
            "⚠️ DB_SSL=true but CA certificate was not found:",
            CA_CERT_PATH
        );
    }
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
    // CHARACTER SET
    // --------------------------------------------------------

    charset: "utf8mb4_general_ci",

    // --------------------------------------------------------
    // CONNECTION
    // --------------------------------------------------------

    waitForConnections: true,

    connectionLimit: Number(
        process.env.DB_CONNECTION_LIMIT || 10
    ),

    maxIdle: Number(
        process.env.DB_CONNECTION_LIMIT || 10
    ),

    idleTimeout: 60000,

    queueLimit: Number(
        process.env.DB_QUEUE_LIMIT || 0
    ),

    enableKeepAlive: true,

    keepAliveInitialDelay: 0,

    // --------------------------------------------------------
    // CONNECTION TIMEOUT
    // --------------------------------------------------------

    connectTimeout: Number(
        process.env.DB_CONNECT_TIMEOUT || 30000
    ),

    // --------------------------------------------------------
    // MYSQL OPTIONS
    // --------------------------------------------------------

    multipleStatements: false,

    // --------------------------------------------------------
    // SSL / TLS
    //
    // IMPORTANT:
    // DB_SSL=false  -> no SSL configuration
    // DB_SSL=true   -> SSL configuration enabled
    // --------------------------------------------------------

    ...(DB_SSL
        ? {
              ssl: {
                  ...(caCertificate
                      ? { ca: caCertificate }
                      : {}),

                  rejectUnauthorized:
                      Boolean(caCertificate),

                  minVersion: "TLSv1.2",

                  servername: DB_HOST
              }
          }
        : {})
};

// ============================================================
// DISPLAY CONFIGURATION
// ============================================================

console.log("");

console.log(
    "============================================================"
);

console.log(
    "              MIARCUS DATABASE CONFIGURATION"
);

console.log(
    "============================================================"
);

console.log("Provider       : Company MySQL");

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
    DB_SSL ? "ENABLED" : "DISABLED"
);

console.log(
    "SSL Verify     :",
    DB_SSL && caCertificate
        ? "ENABLED"
        : "DISABLED"
);

console.log(
    "CA Certificate :",
    caCertificate ? "LOADED" : "NOT USED"
);

console.log(
    "Pool           :",
    process.env.DB_CONNECTION_LIMIT || 10
);

console.log(
    "Timeout        :",
    process.env.DB_CONNECT_TIMEOUT || 30000
);

console.log("============================================================");

console.log("");

// ============================================================
// CREATE MYSQL POOL
// ============================================================

const pool = mysql.createPool(dbConfig);

// ============================================================
// POOL-LEVEL ERROR HANDLER
// ============================================================

pool.on("error", (err) => {
    console.error("");

    console.error(
        "⚠️ MYSQL POOL ERROR (non-fatal, pool will reconnect):"
    );

    console.error(
        "Code    :",
        err.code
    );

    console.error(
        "Message :",
        err.message
    );

    console.error("");
});

// ============================================================
// QUERY
// Supports callback-style and async/await usage
// ============================================================

function query(sql, params = [], callback) {

    // Support:
    // db.query(sql, callback)

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
// EXECUTE
// Supports callback-style and async/await usage
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
// TEST DATABASE CONNECTION
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

        console.log(
            "Host     :",
            DB_HOST
        );

        console.log(
            "Port     :",
            DB_PORT
        );

        console.log(
            "Database :",
            DB_NAME
        );

        console.log(
            "User     :",
            DB_USER
        );

        console.log(
            "SSL      :",
            DB_SSL
                ? caCertificate
                    ? "ENABLED + CA"
                    : "ENABLED WITHOUT CA"
                : "DISABLED"
        );

        console.log("");

        connection = await pool.getConnection();

        console.log(
            "🔌 MySQL connection acquired"
        );

        await connection.ping();

        console.log(
            "🏓 MySQL ping successful"
        );

        const [rows] = await connection.query(
            "SELECT 1 AS test"
        );

        console.log(
            "🧪 Test query result:",
            rows
        );

        console.log("");

        console.log(
            "✅ MYSQL CONNECTION SUCCESSFUL"
        );

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
            "SSL       :",
            DB_SSL ? "ENABLED" : "DISABLED"
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

        if (
            error.code ===
            "HANDSHAKE_SSL_ERROR"
        ) {

            console.error(
                "⚠️ SSL/TLS handshake failed."
            );

            console.error(
                "Check DB_SSL and CA certificate settings."
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

        const success =
            await testDatabaseConnection();

        if (success) {
            return true;
        }

        if (attempt < maxAttempts) {

            console.log(
                `⏳ Retrying in ${delay / 1000}s...`
            );

            await new Promise(
                (resolve) =>
                    setTimeout(resolve, delay)
            );

            // Exponential backoff,
            // capped at 20 seconds

            delay = Math.min(
                delay * 2,
                20000
            );
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