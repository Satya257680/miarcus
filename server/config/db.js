require("dotenv").config();

const mysql = require("mysql2");

// ======================================================
// DATABASE CONFIGURATION
// ======================================================

console.log("================================");
console.log("DATABASE CONFIGURATION");
console.log("================================");

console.log("DB_HOST :", process.env.DB_HOST);
console.log("DB_NAME :", process.env.DB_NAME);
console.log("DB_USER :", process.env.DB_USER);

console.log("================================");

// ======================================================
// DATABASE CONNECTION
// ======================================================

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// ======================================================
// CONNECT DATABASE
// ======================================================

db.connect((err) => {

    if (err) {

        console.error("❌ MySQL Connection Failed");
        console.error(err);

        process.exit(1);

    }

    console.log("✅ MySQL Connected Successfully");

    // ======================================================
    // VERIFY ACTIVE DATABASE
    // ======================================================

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

            console.log(
                "================================"
            );

            console.log(
                "ACTIVE DATABASE CONNECTION"
            );

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

            console.log(
                "================================"
            );

            // ==================================================
            // VERIFY NEW STORE OPENINGS COLUMNS
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

                    console.log(
                        "created_by column:",
                        columnResult
                    );

                }
            );

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

                    console.log(
                        "updated_by column:",
                        columnResult
                    );

                }
            );

        }
    );

});

// ======================================================
// EXPORT
// ======================================================

module.exports = db;