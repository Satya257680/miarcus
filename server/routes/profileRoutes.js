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

    const userId = req.body.userId;
    const name = req.body.name;
    const employeeId = req.body.employeeId;

    // First get existing photo
    db.query(
      "SELECT profile_photo FROM users WHERE id=?",
      [userId],
      (err, result) => {

        if (err) {
          return res.status(500).json({
            success: false,
            message: "Database Error",
          });
        }

        let imageName = result[0]?.profile_photo || null;

        // Replace only if a new photo is uploaded
        if (req.file) {
          imageName = req.file.filename;
        }

        db.query(
          "UPDATE users SET name=?, employee_id=?, profile_photo=? WHERE id=?",
          [
            name,
            employeeId,
            imageName,
            userId
          ],
          (err) => {

            if (err) {

              return res.status(500).json({
                success: false,
                message: "Database Error",
              });

            }

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