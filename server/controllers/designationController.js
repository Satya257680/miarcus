const designationModel = require("../models/designationModel");

// ==========================
// Get All Designations
// ==========================

exports.getAllDesignations = (req, res) => {
  designationModel.getAllDesignations((err, results) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch designations",
        error: err,
      });
    }

    res.json({
      success: true,
      data: results,
    });
  });
};

// ==========================
// Create Designation
// ==========================

exports.createDesignation = (req, res) => {
  const {
    department_id,
    designation_name,
    description,
    status,
    users,
  } = req.body;

  designationModel.checkDesignationExists(
    designation_name,
    department_id,
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      if (result.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Designation already exists in this department.",
        });
      }

      designationModel.createDesignation(
        {
          department_id,
          designation_name,
          description,
          status,
        },
        (err, insertResult) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: "Failed to create designation",
            });
          }

          designationModel.assignUsers(
            insertResult.insertId,
            users,
            (assignErr) => {
              if (assignErr) {
                return res.status(500).json({
                  success: false,
                  message:
                    "Designation created but employee assignment failed.",
                });
              }

              res.status(201).json({
                success: true,
                message: "Designation created successfully",
                id: insertResult.insertId,
              });
            }
          );
        }
      );
    }
  );
};

// ==========================
// Update Designation
// ==========================

exports.updateDesignation = (req, res) => {
  const { id } = req.params;
  const { users } = req.body;

  designationModel.updateDesignation(id, req.body, (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Failed to update designation",
      });
    }

    designationModel.removeAssignedUsers(id, (removeErr) => {
      if (removeErr) {
        return res.status(500).json({
          success: false,
          message: "Failed to remove assigned employees",
        });
      }

      designationModel.assignUsers(id, users, (assignErr) => {
        if (assignErr) {
          return res.status(500).json({
            success: false,
            message: "Failed to assign employees",
          });
        }

        res.json({
          success: true,
          message: "Designation updated successfully",
        });
      });
    });
  });
};

// ==========================
// Delete Designation
// ==========================

exports.deleteDesignation = (req, res) => {
  const { id } = req.params;

  designationModel.deleteDesignation(id, (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete designation",
      });
    }

    res.json({
      success: true,
      message: "Designation deleted successfully",
    });
  });
};