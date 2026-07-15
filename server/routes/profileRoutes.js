const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const db = require("../config/db");

/* ===========================
   Upload / Update Profile
=========================== */

router.post(
  "/upload-photo",
  upload.single("profilePhoto"),
  (req, res) => {

    const name = req.body.name;
    const employeeId = req.body.employeeId;

    let imageName = null;

    if (req.file) {
      imageName = req.file.filename;
    }

    db.query(
      "UPDATE users SET name=?, employee_id=?, profile_photo=? WHERE id=?",
      [
        name,
        employeeId,
        imageName,
        1
      ],
      (err, result) => {

        if (err) {
          console.log(err);

          return res.status(500).json({
            success: false,
            message: "Database Error",
            error: err.message,
          });
        }

        res.json({
          success: true,
          message: "Profile Updated Successfully",
          fileName: imageName,
          imageUrl: imageName
            ? `/uploads/${imageName}`
            : null,
        });

      }
    );

  }
);

/* ===========================
   Get User Profile
=========================== */

router.get("/user/:id", (req, res) => {

  db.query(
    "SELECT * FROM users WHERE id=?",
    [req.params.id],
    (err, result) => {

      if (err) {
        console.log(err);

        return res.status(500).json({
          success: false,
          message: "Database Error",
        });
      }

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User Not Found",
        });
      }

      res.json({
        success: true,
        user: result[0],
      });

    }
  );

});

module.exports = router;