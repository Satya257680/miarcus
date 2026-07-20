const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// ================= Middleware =================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================= Upload Folder =================

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= Home =================

app.get("/", (req, res) => {
  res.send("🚀 Miarcus Backend Running...");
});

// ================= Routes =================

// Authentication
try {
  const authRoutes = require("./routes/authRoutes");
  console.log("✅ authRoutes Loaded");
  app.use("/api/auth", authRoutes);
} catch (err) {
  console.error("❌ authRoutes Error");
  console.error(err);
}

// Stores
try {
  const storeRoutes = require("./routes/storeRoutes");
  console.log("✅ storeRoutes Loaded");
  app.use("/api/stores", storeRoutes);
} catch (err) {
  console.error("❌ storeRoutes Error");
  console.error(err);
}

// Action Points
try {
  const actionPointRoutes = require("./routes/actionPointRoutes");
  console.log("✅ actionPointRoutes Loaded");
  app.use("/api/action-points", actionPointRoutes);
} catch (err) {
  console.error("❌ actionPointRoutes Error");
  console.error(err);
}

// Profile
try {
  const profileRoutes = require("./routes/profileRoutes");
  console.log("✅ profileRoutes Loaded");
  app.use("/api/profile", profileRoutes);
} catch (err) {
  console.error("❌ profileRoutes Error");
  console.error(err);
}

// Users
try {
  const userRoutes = require("./routes/userRoutes");
  console.log("✅ userRoutes Loaded");
  app.use("/api/users", userRoutes);
} catch (err) {
  console.error("❌ userRoutes Error");
  console.error(err);
}

// Departments
try {
  const departmentRoutes = require("./routes/departmentRoutes");
  console.log("✅ departmentRoutes Loaded");
  app.use("/api/departments", departmentRoutes);
} catch (err) {
  console.error("❌ departmentRoutes Error");
  console.error(err);
}

// Designations
try {
  const designationRoutes = require("./routes/designationRoutes");
  console.log("✅ designationRoutes Loaded");
  app.use("/api/designations", designationRoutes);
} catch (err) {
  console.error("❌ designationRoutes Error");
  console.error(err);
}

// Checklist Types
try {
  const checklistTypeRoutes = require("./routes/checklistTypeRoutes");
  console.log("✅ checklistTypeRoutes Loaded");
  app.use("/api/checklist-types", checklistTypeRoutes);
} catch (err) {
  console.error("❌ checklistTypeRoutes Error");
  console.error(err);
}

// ✅ Checklist Questions
try {
  const questionRoutes = require("./routes/questionRoutes");
  console.log("✅ questionRoutes Loaded");
  app.use("/api/questions", questionRoutes);
} catch (err) {
  console.error("❌ questionRoutes Error");
  console.error(err);
}

// Reports To
try {
  const reportsToRoutes = require("./routes/reportsToRoutes");
  console.log("✅ reportsToRoutes Loaded");
  app.use("/api/reports", reportsToRoutes);
} catch (err) {
  console.error("❌ reportsToRoutes Error");
  console.error(err);
}

// Checklist Reports
try {
  const checklistReportRoutes = require("./routes/checklistReportRoutes");
  console.log("✅ checklistReportRoutes Loaded");
  app.use("/api/checklist-reports", checklistReportRoutes);
} catch (err) {
  console.error("❌ checklistReportRoutes Error");
  console.error(err);
}

// ================= 404 =================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

// ================= Global Error Handler =================

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ================= Start Server =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("====================================");
  console.log(`🚀 Server Running on http://localhost:${PORT}`);
  console.log("====================================");
});