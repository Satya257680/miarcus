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

    console.log("========== PROFILE REQUEST ==========");
    console.log(req.body);

    if (req.file) {
      console.log(req.file);
    }

    const userId = req.body.userId;
    const name = req.body.name;
    const employeeId = req.body.employeeId;

    // Check User ID
    if (!userId) {

      return res.status(400).json({
        success: false,
        message: "User ID is missing",
      });

    }

    // Get Existing Photo
    db.query(
      "SELECT profile_photo FROM users WHERE id=?",
      [userId],
      (err, result) => {

        if (err) {

          console.log("========== SELECT PROFILE ERROR ==========");
          console.log(err);

          return res.status(500).json({
            success: false,
            message: "Database Error",
            error: err.sqlMessage || err.message,
          });

        }

        if (result.length === 0) {

          return res.status(404).json({
            success: false,
            message: "User not found",
          });

        }

        let imageName = result[0].profile_photo;

        // Replace only if new image uploaded
        if (req.file) {
          imageName = req.file.filename;
        }

        db.query(
          `
          UPDATE users
          SET
            name = ?,
            employee_id = ?,
            profile_photo = ?
          WHERE id = ?
          `,
          [
            name,
            employeeId,
            imageName,
            userId,
          ],
          (err, updateResult) => {

            if (err) {

              console.log("========== UPDATE PROFILE ERROR ==========");
              console.log(err);

              return res.status(500).json({
                success: false,
                message: "Database Error",
                error: err.sqlMessage || err.message,
              });

            }

            console.log("Profile Updated Successfully");

            res.json({
              success: true,
              message: "Profile Updated Successfully",
              fileName: imageName,
              imageUrl: `/uploads/${imageName}`,
            });

          }
        );

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

        console.log("========== GET PROFILE ERROR ==========");
        console.log(err);

        return res.status(500).json({
          success: false,
          message: "Database Error",
          error: err.sqlMessage || err.message,
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