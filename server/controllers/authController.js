const db = require("../config/db");

// ================= LOGIN =================

const loginUser = (req, res) => {

    const { email, password } = req.body;

    const sql =
        "SELECT * FROM users WHERE email = ? AND password = ?";

    db.query(sql, [email, password], (err, result) => {

        if (err) {
            return res.status(500).json({
                message: "Database Error",
            });
        }

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

// ================= FORGOT PASSWORD =================

const forgotPassword = (req, res) => {

    const { email } = req.body;

    const sql = "SELECT * FROM users WHERE email = ?";

    db.query(sql, [email], (err, result) => {

        if (err) {

            return res.status(500).json({
                message: "Database Error",
            });

        }

        if (result.length === 0) {

            return res.status(404).json({
                message: "Email Not Found",
            });

        }

        return res.status(200).json({
            message: "Email Verified",
        });

    });

};

// ================= RESET PASSWORD =================

const resetPassword = (req, res) => {

    const { email, password } = req.body;

    const sql =
        "UPDATE users SET password = ? WHERE email = ?";

    db.query(sql, [password, email], (err, result) => {

        if (err) {

            return res.status(500).json({
                message: "Database Error",
            });

        }

        if (result.affectedRows === 0) {

            return res.status(404).json({
                message: "User Not Found",
            });

        }

        return res.status(200).json({
            message: "Password Updated Successfully",
        });

    });

};

module.exports = {
    loginUser,
    forgotPassword,
    resetPassword,
};