const express = require("express");
const multer = require("multer");

const router = express.Router();

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

router.get("/", getStores);

// ==============================
// Create Store
// ==============================

router.post("/", createStore);

// ==============================
// Import CSV
// ==============================

router.post(
  "/import",
  upload.single("file"),
  importStoresFromCSV
);

// ==============================
// Delete All Stores
// ==============================

router.delete("/delete-all", deleteAllStores);

// ==============================
// Update Store
// ==============================

router.put("/:id", updateStore);

// ==============================
// Delete Single Store
// ==============================

router.delete("/:id", deleteStore);

module.exports = router;