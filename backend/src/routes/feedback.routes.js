import express from "express";
const router = express.Router();

import * as feedbackController from "../controllers/feedback.controller.js";
import validate from "../middlewares/validate.middleware.js";
import {
  createFeedbackValidator,
  updateFeedbackValidator,
  updateFeedbackStatusValidator
} from "../validators/feedback.validator.js";

router.post("/", createFeedbackValidator, validate, feedbackController.createFeedback);
router.get("/", feedbackController.getAllFeedback);

router.patch("/:id/status", updateFeedbackStatusValidator, validate, feedbackController.updateFeedbackStatus);

router.get("/:id", feedbackController.getFeedbackById);
router.put("/:id", updateFeedbackValidator, validate, feedbackController.updateFeedback);
router.delete("/:id", feedbackController.deleteFeedback);

export default router;