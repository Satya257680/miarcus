const db = require("../config/db");

const loginUser = (req, res) => {
  const { email, password } = req.body;

  console.log("========== LOGIN REQUEST ==========");
  console.log("Email:", email);
  console.log("Password:", password);

  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";

  db.query(sql, [email, password], (err, result) => {
    if (err) {
      console.log("Database Error:", err);

      return res.status(500).json({
        message: "Database Error",
      });
    }

    console.log("Query Result:", result);

    if (result.length > 0) {
      return res.status(200).json({
        message: "Login Successful",
        user: result[0],
      });
    }

    return res.status(401).json({
      message: "Invalid Email or Password",
    });
  });
};

module.exports = {
  loginUser,
};