import { body, param } from "express-validator";

export const createFeedbackValidator = [
  body("name").trim().notEmpty().withMessage("name is required"),
  body("email").trim().isEmail().withMessage("valid email is required"),
  body("message").trim().notEmpty().withMessage("message is required"),
  body("type")
    .optional()
    .isIn(["bug", "suggestion", "complaint", "other"])
    .withMessage("type must be bug/suggestion/complaint/other"),
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("rating must be 1-5"),
];

export const feedbackIdParamValidator = [
  param("id").isMongoId().withMessage("invalid feedback id"),
];

export const updateFeedbackStatusValidator = [
  param("id").isMongoId().withMessage("invalid feedback id"),
  body("status")
    .notEmpty()
    .isIn(["new", "in_progress", "resolved"])
    .withMessage("status must be new/in_progress/resolved"),
];