require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function testAiven() {
    console.log("\n========================================");
    console.log("       AIVEN MYSQL CONNECTION TEST");
    console.log("========================================");

    const required = [
        "DB_HOST",
        "DB_PORT",
        "DB_NAME",
        "DB_USER",
        "DB_PASSWORD"
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        console.error(
            `\n❌ Missing required environment variables: ${missing.join(", ")}`
        );
        process.exit(1);
    }

    const caPath = process.env.DB_SSL_CA_PATH
        ? path.resolve(process.env.DB_SSL_CA_PATH)
        : path.resolve(__dirname, "../config/ca.pem");

    if (!fs.existsSync(caPath)) {
        console.error("\n❌ Aiven CA certificate was not found.");
        console.error("Expected:", caPath);
        console.error(
            "\nDownload the Aiven CA certificate and configure DB_SSL_CA_PATH."
        );
        process.exit(1);
    }

    console.log("Host     :", process.env.DB_HOST);
    console.log("Port     :", process.env.DB_PORT);
    console.log("Database :", process.env.DB_NAME);
    console.log("User     :", process.env.DB_USER);
    console.log("Password :", "********");
    console.log("TLS CA   :", caPath);

    let connection;

    try {
        const ca = fs.readFileSync(caPath);

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,

            ssl: {
                ca,
                rejectUnauthorized: true
            },

            connectTimeout: 30000,

            multipleStatements: false
        });

        console.log("\n✅ AIVEN MYSQL CONNECTED SUCCESSFULLY");

        const [rows] = await connection.execute(`
            SELECT
                @@hostname AS hostname,
                @@port AS port,
                USER() AS user,
                DATABASE() AS database_name,
                VERSION() AS mysql_version
        `);

        console.table(rows);

        console.log("\n========================================");
        console.log("       TLS VERIFIED SUCCESSFULLY");
        console.log("========================================");

        await connection.end();

        console.log("\n✅ CONNECTION TEST COMPLETED");

    } catch (error) {
        console.error("\n❌ AIVEN MYSQL CONNECTION FAILED");

        console.error("Code    :", error.code || "UNKNOWN");
        console.error("Errno   :", error.errno || "UNKNOWN");
        console.error("Message :", error.message || "Unknown error");
        console.error("SQLState:", error.sqlState || "UNKNOWN");

        if (connection) {
            try {
                await connection.end();
            } catch {
                // Ignore cleanup errors
            }
        }

        process.exit(1);
    }
}

testAiven();