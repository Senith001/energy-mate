import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
  createFeedback,
  getMyFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
} from "../controllers/feedback.controller.js";

import {
  createFeedbackValidator,
  feedbackIdParamValidator,
  updateFeedbackStatusValidator,
} from "../validators/feedback.validator.js";

const router = express.Router();

// USER
router.post("/", protect, createFeedbackValidator, validate, createFeedback);
router.get("/my", protect, getMyFeedback);

// ADMIN
router.get("/", protect, authorize("admin"), getAllFeedback);

// ADMIN OR OWNER
router.get("/:id", protect, feedbackIdParamValidator, validate, getFeedbackById);
router.delete("/:id", protect, feedbackIdParamValidator, validate, deleteFeedback);

// ADMIN ONLY UPDATE STATUS
router.patch(
  "/:id/status",
  protect,
  authorize("admin"),
  updateFeedbackStatusValidator,
  validate,
  updateFeedbackStatus
);

export default router;