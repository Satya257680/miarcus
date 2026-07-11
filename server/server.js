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

// Authentication
app.use("/api/auth", authRoutes);

// Stores
app.use("/api/stores", storeRoutes);

// Action Points
app.use("/api/action-points", actionPointRoutes);

// ================= Test Route =================

app.get("/", (req, res) => {
    res.send("🚀 Miarcus Backend Running...");
});

// ================= 404 Handler =================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route Not Found",
    });
});

// ================= Server =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});