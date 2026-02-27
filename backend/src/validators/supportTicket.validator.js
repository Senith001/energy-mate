import { body, param } from "express-validator";

export const createTicketValidator = [
  body("name").trim().notEmpty().withMessage("name is required"),
  body("email").trim().isEmail().withMessage("valid email is required"),
  body("subject").trim().notEmpty().withMessage("subject is required"),
  body("description").trim().notEmpty().withMessage("description is required"),

  body("category")
    .optional()
    .isIn(["billing", "technical", "usage", "other"])
    .withMessage("category must be billing/technical/usage/other"),

  body("priority")
    .optional()
    .isIn(["low", "medium", "high"])
    .withMessage("priority must be low/medium/high"),
];

export const ticketIdParamValidator = [
  param("id").isMongoId().withMessage("invalid ticket id"),
];

export const updateTicketStatusValidator = [
  param("id").isMongoId().withMessage("invalid ticket id"),
  body("status")
    .notEmpty()
    .isIn(["open", "in_progress", "resolved"])
    .withMessage("status must be open/in_progress/resolved"),
];

export const addMessageValidator = [
  param("id").isMongoId().withMessage("invalid ticket id"),
  body("text").trim().notEmpty().withMessage("text is required"),
  body("sender")
    .optional()
    .isIn(["user", "admin"])
    .withMessage("sender must be user/admin"),
];