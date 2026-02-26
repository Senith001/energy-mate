import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";

import { connectDB } from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);

// Health
app.get("/health", (req, res) => {
  res.json({ status: "✅ MongoDB Connected"});
});

// Routes
app.use("/api/users", userRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ✅ Error handler MUST have 4 params (err, req, res, next)
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err);
  res.status(500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5001;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });