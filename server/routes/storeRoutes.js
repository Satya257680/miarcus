const express = require("express");
const multer = require("multer");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");

const {
  getStores,
  createStore,
  updateStore,
  deleteStore,
  deleteAllStores,
  importStoresFromCSV,
} = require("../controllers/storeController");

// ==============================
// Multer Configuration
// ==============================

const storage = multer.diskStorage({

  destination: (req, file, cb) => {

    cb(null, "uploads/");

  },

  filename: (req, file, cb) => {

    cb(null, Date.now() + "-" + file.originalname);

  },

});

const upload = multer({

  storage,

  limits: {

    fileSize: 5 * 1024 * 1024, // 5 MB

  },

  fileFilter: (req, file, cb) => {

    if (
      file.mimetype === "text/csv" ||
      file.originalname.toLowerCase().endsWith(".csv")
    ) {

      cb(null, true);

    } else {

      cb(new Error("Only CSV files are allowed."));

    }

  },

});

// ==============================
// Get All Stores
// Permission: View
// ==============================

router.get(
  "/",
  authMiddleware,
  permissionMiddleware("Store Management", "View"),
  getStores
);

// ==============================
// Create Store
// Permission: Add
// ==============================

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("Store Management", "Add"),
  createStore
);

// ==============================
// Import Stores CSV
// Permission: Add
// ==============================

router.post(
  "/import",
  authMiddleware,
  permissionMiddleware("Store Management", "Add"),
  upload.single("file"),
  importStoresFromCSV
);

// ==============================
// Update Store
// Permission: Edit
// ==============================

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("Store Management", "Edit"),
  updateStore
);

// ==============================
// Delete Single Store
// Permission: Full
// ==============================

router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware("Store Management", "Full"),
  deleteStore
);

// ==============================
// Delete All Stores
// Permission: Full
// ==============================

router.delete(
  "/delete-all",
  authMiddleware,
  permissionMiddleware("Store Management", "Full"),
  deleteAllStores
);

module.exports = router;