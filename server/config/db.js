const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Satya@179",
  database: "miarcus",
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL Connection Failed");
    console.error(err);
    process.exit(1);
  }

  console.log("✅ MySQL Connected Successfully");
});

module.exports = db;