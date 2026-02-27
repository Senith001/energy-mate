import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import path from "path";

// Routes
import userRoutes from "./routes/userRoutes.js";
import householdRoutes from "./routes/household.routes.js";
import roomRoutes from "./routes/room.routes.js";
import applianceRoutes from "./routes/appliance.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import supportTicketRoutes from "./routes/supportTicket.routes.js";
import usageRoutes from "./routes/usageRoutes.js";
import billRoutes from "./routes/billRoutes.js";
import tariffRoutes from "./routes/tariffRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";

// Middlewares
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(morgan("dev"));

app.use(cors({origin: process.env.CLIENT_URL || "*", credentials: true,}));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ================= HEALTH CHECK =================
app.get("/health", (req, res) => {
  res.json({ status: "✅ Server is running" });
});

// ================= ROUTES =================

// User routes
app.use("/api/users", userRoutes);

// Household system routes
app.use("/api/households", householdRoutes);
app.use("/api", roomRoutes);
app.use("/api", applianceRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/support", supportTicketRoutes);
app.use("/api/recommendations", recommendationRoutes);

//Usage and billing routes
app.use("/api/usage", usageRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/tariffs", tariffRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("It Is Working......");
});

// ================= ERROR HANDLING =================
app.use(notFound);
app.use(errorHandler);

// ================= DATABASE + SERVER START =================
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err.message);
    process.exit(1);
  });