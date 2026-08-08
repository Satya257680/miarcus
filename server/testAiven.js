require("dotenv").config();

const mysql = require("mysql2/promise");

async function testAiven() {
    console.log("\n========================================");
    console.log("       AIVEN MYSQL CONNECTION TEST");
    console.log("========================================");

    console.log("Host     :", process.env.DB_HOST);
    console.log("Port     :", process.env.DB_PORT);
    console.log("Database :", process.env.DB_NAME);
    console.log("User     :", process.env.DB_USER);
    console.log("Password :", process.env.DB_PASSWORD ? "********" : "MISSING");

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || "defaultdb",

            ssl: {
                rejectUnauthorized: false
            },

            connectTimeout: 30000
        });

        console.log("\n✅ AIVEN MYSQL CONNECTED SUCCESSFULLY");

        const [rows] = await connection.query(`
            SELECT
                @@hostname AS hostname,
                @@port AS port,
                USER() AS user,
                DATABASE() AS database_name,
                VERSION() AS mysql_version
        `);

        console.table(rows);

        const [databases] = await connection.query(`
            SHOW DATABASES
        `);

        console.log("\nAVAILABLE DATABASES:");
        console.table(databases);

        await connection.end();

        console.log("\n✅ CONNECTION TEST COMPLETED");

    } catch (error) {

        console.log("\n❌ AIVEN MYSQL CONNECTION FAILED");

        console.log("Code    :", error.code);
        console.log("Errno   :", error.errno);
        console.log("Message :", error.message);
        console.log("SQLState:", error.sqlState);

        console.log("\nFull error:");
        console.error(error);

        process.exit(1);
    }
}

testAiven();