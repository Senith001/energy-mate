import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import {
  createFeedback,
  getMyFeedback,
  getAllFeedback,
  updateFeedbackStatus,
} from "../controllers/feedback.controller.js";

const router = express.Router();

router.post("/", protect, createFeedback);
router.get("/my", protect, getMyFeedback);

router.get("/", protect, authorize("admin"), getAllFeedback);
router.patch("/:id/status", protect, authorize("admin"), updateFeedbackStatus);

export default router;