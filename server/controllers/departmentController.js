const Department = require("../models/departmentModel");

// ==============================
// Get All Departments
// ==============================
exports.getDepartments = (req, res) => {
  Department.getAllDepartments((err, results) => {
    if (err) {
      console.error("Get Departments Error:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch departments",
        error: err.message,
      });
    }

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  });
};

// ==============================
// Add Department
// ==============================
exports.createDepartment = (req, res) => {
  let { department_name, description, status, users } = req.body;

  console.log("\n========== CREATE DEPARTMENT ==========");
  console.log("Request Body:", req.body);

  department_name = department_name?.trim();

  if (!department_name) {
    return res.status(400).json({
      success: false,
      message: "Department name is required.",
    });
  }

  description = description?.trim() || "";
  status = status || "Active";
  users = users || [];

  console.log("Selected Users:", users);

  Department.checkDepartmentExists(department_name, (err, result) => {
    if (err) {
      console.error("Duplicate Check Error:", err);

      return res.status(500).json({
        success: false,
        message: "Database error",
        error: err.message,
      });
    }

    if (result.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Department already exists.",
      });
    }

    Department.createDepartment(
      {
        department_name,
        description,
        status,
      },
      (err, data) => {
        if (err) {
          console.error("Create Department Error:", err);

          return res.status(500).json({
            success: false,
            message: "Unable to create department",
            error: err.message,
          });
        }

        console.log("Department Created Successfully");
        console.log("Department ID:", data.insertId);

        Department.assignUsers(
          data.insertId,
          users,
          (assignErr) => {

            if (assignErr) {

              console.log("\n========== ASSIGN USERS ERROR ==========");
              console.log(assignErr);
              console.log("========================================");

              return res.status(500).json({
                success: false,
                message: assignErr.sqlMessage || assignErr.message,
                error: assignErr,
              });
            }

            console.log("Users Assigned Successfully");

            res.status(201).json({
              success: true,
              message: "Department created successfully.",
              id: data.insertId,
            });
          }
        );
      }
    );
  });
};

// ==============================
// Update Department
// ==============================
exports.updateDepartment = (req, res) => {

  const id = req.params.id;

  let {
    department_name,
    description,
    status,
    users,
  } = req.body;

  console.log("\n========== UPDATE DEPARTMENT ==========");
  console.log("Department ID:", id);
  console.log("Request Body:", req.body);

  department_name = department_name?.trim();

  if (!department_name) {
    return res.status(400).json({
      success: false,
      message: "Department name is required.",
    });
  }

  users = users || [];

  Department.updateDepartment(
    id,
    {
      department_name,
      description,
      status,
    },
    (err) => {

      if (err) {

        console.error("Update Error:", err);

        return res.status(500).json({
          success: false,
          message: "Unable to update department",
          error: err.message,
        });
      }

      Department.removeAssignedUsers(id, (removeErr) => {

        if (removeErr) {

          console.error("Remove Mapping Error:", removeErr);

          return res.status(500).json({
            success: false,
            message: "Unable to update employee mapping.",
            error: removeErr.message,
          });
        }

        Department.assignUsers(
          id,
          users,
          (assignErr) => {

            if (assignErr) {

              console.error("Assign Users Error:", assignErr);

              return res.status(500).json({
                success: false,
                message: assignErr.sqlMessage || assignErr.message,
                error: assignErr,
              });
            }

            res.status(200).json({
              success: true,
              message: "Department updated successfully.",
            });

          }
        );
      });
    }
  );
};

// ==============================
// Get Assigned Users
// ==============================
exports.getAssignedUsers = (req, res) => {

  const departmentId = req.params.id;

  Department.getAssignedUsers(
    departmentId,
    (err, result) => {

      if (err) {

        console.error(err);

        return res.status(500).json({
          success: false,
          message: "Unable to fetch assigned users.",
          error: err.message,
        });
      }

      res.json({
        success: true,
        users: result,
      });

    }
  );
};

// ==============================
// Delete Department
// ==============================
exports.deleteDepartment = (req, res) => {

  const id = req.params.id;

  Department.deleteDepartment(id, (err) => {

    if (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message: "Unable to delete department",
        error: err.message,
      });
    }

    res.status(200).json({
      success: true,
      message: "Department deleted successfully.",
    });

  });

};