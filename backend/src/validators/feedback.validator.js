import { body } from "express-validator";

export const createFeedbackValidator = [
  body("name").notEmpty().withMessage("name is required"),
  body("email").notEmpty().isEmail().withMessage("email must be valid"),
  body("type").optional().isIn(["bug", "suggestion", "complaint", "other"]),
  body("message").notEmpty().isLength({ min: 5 }).withMessage("message must be at least 5 chars"),
  body("rating").optional({ nullable: true }).isInt({ min: 1, max: 5 })
];

export const updateFeedbackValidator = [
  body("name").optional().notEmpty(),
  body("email").optional().isEmail(),
  body("type").optional().isIn(["bug", "suggestion", "complaint", "other"]),
  body("message").optional().isLength({ min: 5 }),
  body("rating").optional({ nullable: true }).isInt({ min: 1, max: 5 })
];

export const updateFeedbackStatusValidator = [
  body("status").notEmpty().isIn(["new", "in_progress", "resolved"])
];