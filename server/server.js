const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const storeRoutes = require("./routes/storeRoutes");
const actionPointRoutes = require("./routes/actionPointRoutes");
const profileRoutes = require("./routes/profileRoutes");
const userRoutes = require("./routes/userRoutes"); // ✅ NEW

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
app.use("/api/auth", authRoutes);

// Stores
app.use("/api/stores", storeRoutes);

// Action Points
app.use("/api/action-points", actionPointRoutes);

// Profile
app.use("/api/profile", profileRoutes);

// Users ✅ NEW
app.use("/api/users", userRoutes);

// ================= 404 =================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route Not Found",
    });
});

// ================= Error Handler =================

app.use((err, req, res, next) => {
    console.error("Server Error:");
    console.error(err);

    res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

// ================= Server =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("================================");
    console.log("🚀 Miarcus Backend Started");
    console.log(`🌐 Server Running: http://localhost:${PORT}`);
    console.log("================================");
});