const db = require("../config/db");

// ================= LOGIN =================

// ================= LOGIN =================

const loginUser = (req, res) => {

    const { email, password } = req.body;

    const sql = `
        SELECT
            id,
            employee_id,
            name,
            email,
            password,
            profile_photo
        FROM users
        WHERE email = ?
        AND password = ?
        LIMIT 1
    `;

    db.query(sql, [email, password], (err, result) => {

        if (err) {

            return res.status(500).json({
                success: false,
                message: "Database Error",
            });

        }

        if (result.length === 0) {

            return res.status(401).json({
                success: false,
                message: "Invalid Email or Password",
            });

        }

        const user = result[0];

        return res.status(200).json({

            success: true,

            message: "Login Successful",

            user: {
                id: user.id,
                employee_id: user.employee_id,
                name: user.name,
                email: user.email,
                profile_photo: user.profile_photo,
            }

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