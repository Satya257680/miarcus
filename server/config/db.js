require("dotenv").config();

const mysql = require("mysql2");

// ======================================================
// DATABASE CONFIGURATION
// ======================================================

console.log("================================");
console.log("DATABASE CONFIGURATION");
console.log("================================");

const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

// Do NOT print the database password
console.log("DB_HOST :", DB_HOST || "NOT SET");
console.log("DB_PORT :", DB_PORT);
console.log("DB_NAME :", DB_NAME || "NOT SET");
console.log("DB_USER :", DB_USER || "NOT SET");

console.log("================================");

// ======================================================
// ENVIRONMENT VALIDATION
// ======================================================

const missingVariables = [];

if (!DB_HOST) {
    missingVariables.push("DB_HOST");
}

if (!DB_NAME) {
    missingVariables.push("DB_NAME");
}

if (!DB_USER) {
    missingVariables.push("DB_USER");
}

if (missingVariables.length > 0) {
    console.error("❌ Missing database environment variables:");
    console.error(missingVariables.join(", "));
    console.error("================================");

    throw new Error(
        `Missing database environment variables: ${missingVariables.join(", ")}`
    );
}

// ======================================================
// DATABASE CONNECTION
// ======================================================

const db = mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,

    // Production-safe connection options
    connectTimeout: 20000,

    charset: "utf8mb4",

    multipleStatements: false
});

// ======================================================
// CONNECT DATABASE
// ======================================================

db.connect((err) => {

    if (err) {

        console.error("================================");
        console.error("❌ MYSQL CONNECTION FAILED");
        console.error("================================");

        console.error("Host :", DB_HOST);
        console.error("Port :", DB_PORT);
        console.error("Database :", DB_NAME);
        console.error("User :", DB_USER);

        console.error("Error Code :", err.code);
        console.error("Error Message :", err.message);

        console.error("================================");

        return;
    }

    console.log("================================");
    console.log("✅ MYSQL CONNECTED SUCCESSFULLY");
    console.log("================================");

    console.log("Host :", DB_HOST);
    console.log("Port :", DB_PORT);
    console.log("Database :", DB_NAME);
    console.log("User :", DB_USER);

    console.log("================================");

    // ==================================================
    // VERIFY ACTIVE DATABASE
    // ==================================================

    db.query(
        `
        SELECT
            DATABASE() AS database_name,
            @@hostname AS hostname,
            @@port AS port,
            USER() AS mysql_user
        `,
        (error, result) => {

            if (error) {

                console.error(
                    "❌ Database Verification Failed"
                );

                console.error(error);

                return;
            }

            if (!result || result.length === 0) {

                console.error(
                    "❌ Database Verification Returned No Data"
                );

                return;
            }

            console.log("================================");
            console.log("ACTIVE DATABASE CONNECTION");
            console.log("================================");

            console.log(
                "Database:",
                result[0].database_name
            );

            console.log(
                "Hostname:",
                result[0].hostname
            );

            console.log(
                "Port:",
                result[0].port
            );

            console.log(
                "User:",
                result[0].mysql_user
            );

            console.log("================================");

            // ==================================================
            // VERIFY NEW STORE OPENINGS TABLE
            // ==================================================

            db.query(
                `
                SHOW TABLES LIKE 'new_store_openings'
                `,
                (tableError, tableResult) => {

                    if (tableError) {

                        console.error(
                            "❌ new_store_openings table verification failed"
                        );

                        console.error(tableError);

                        return;
                    }

                    if (
                        !tableResult ||
                        tableResult.length === 0
                    ) {

                        console.warn(
                            "⚠️ new_store_openings table not found"
                        );

                        return;
                    }

                    console.log(
                        "✅ new_store_openings table exists"
                    );

                    // ==================================================
                    // VERIFY created_by
                    // ==================================================

                    db.query(
                        `
                        SHOW COLUMNS
                        FROM new_store_openings
                        LIKE 'created_by'
                        `,
                        (columnError, columnResult) => {

                            if (columnError) {

                                console.error(
                                    "❌ created_by verification failed"
                                );

                                console.error(
                                    columnError
                                );

                                return;
                            }

                            if (
                                columnResult &&
                                columnResult.length > 0
                            ) {

                                console.log(
                                    "✅ created_by column exists"
                                );

                            } else {

                                console.warn(
                                    "⚠️ created_by column NOT found"
                                );

                            }

                        }
                    );

                    // ==================================================
                    // VERIFY updated_by
                    // ==================================================

                    db.query(
                        `
                        SHOW COLUMNS
                        FROM new_store_openings
                        LIKE 'updated_by'
                        `,
                        (columnError, columnResult) => {

                            if (columnError) {

                                console.error(
                                    "❌ updated_by verification failed"
                                );

                                console.error(
                                    columnError
                                );

                                return;
                            }

                            if (
                                columnResult &&
                                columnResult.length > 0
                            ) {

                                console.log(
                                    "✅ updated_by column exists"
                                );

                            } else {

                                console.warn(
                                    "⚠️ updated_by column NOT found"
                                );

                            }

                        }
                    );

                }
            );

        }
    );

});

// ======================================================
// CONNECTION ERROR HANDLER
// ======================================================

db.on("error", (err) => {

    console.error("================================");
    console.error("❌ MYSQL CONNECTION ERROR");
    console.error("================================");

    console.error("Code :", err.code);
    console.error("Message :", err.message);

    console.error("================================");

});

// ======================================================
// EXPORT
// ======================================================

module.exports = db;