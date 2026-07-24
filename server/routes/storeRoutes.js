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
});

// ==============================
// Get All Stores
// ==============================

router.get(
  "/",
  authMiddleware,
  permissionMiddleware("Stores", "View"),
  getStores
);

// ==============================
// Create Store
// ==============================

router.post(
  "/",
  authMiddleware,
  permissionMiddleware("Stores", "Add"),
  createStore
);

// ==============================
// Import CSV
// ==============================

router.post(
  "/import",
  authMiddleware,
  permissionMiddleware("Stores", "Add"),
  upload.single("file"),
  importStoresFromCSV
);

// ==============================
// Delete All Stores
// ==============================

router.delete(
  "/delete-all",
  authMiddleware,
  permissionMiddleware("Stores", "Full"),
  deleteAllStores
);

// ==============================
// Update Store
// ==============================

router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware("Stores", "Edit"),
  updateStore
);

// ==============================
// Delete Single Store
// ==============================

router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware("Stores", "Full"),
  deleteStore
);

module.exports = router;