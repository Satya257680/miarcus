const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const storeRoutes = require("./routes/storeRoutes");
const actionPointRoutes = require("./routes/actionPointRoutes");

const app = express();

// ================= Middleware =================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// ================= Routes =================

// Home Route
app.get("/", (req, res) => {
    res.send("🚀 Miarcus Backend Running...");
});

// Authentication
app.use("/api/auth", authRoutes);

// Stores
app.use("/api/stores", storeRoutes);

// Action Points
app.use("/api/action-points", actionPointRoutes);

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
        message: "Internal Server Error",
    });
});

// ================= Server =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("================================");
    console.log("🚀 Miarcus Backend Started");
    console.log(`🌐 http://localhost:${PORT}`);
    console.log("================================");
});