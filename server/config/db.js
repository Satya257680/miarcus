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
    database: process.env.DB_NAME,
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

    db.query("SELECT DATABASE() AS database_name", (error, result) => {

        if (error) {

            console.error("Database Check Failed");
            console.error(error);

            return;

        }

        console.log("Connected Database:", result[0].database_name);

    });

});

// ======================================================
// EXPORT
// ======================================================

module.exports = db;