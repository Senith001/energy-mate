import { body } from "express-validator";

export const createTicketValidator = [
  body("name").notEmpty().withMessage("name is required"),
  body("email").notEmpty().isEmail().withMessage("email must be valid"),
  body("subject").notEmpty().withMessage("subject is required"),
  body("description").notEmpty().isLength({ min: 5 }).withMessage("description must be at least 5 chars"),
  body("category").optional().isIn(["billing", "usage", "appliance", "account", "other"]),
  body("priority").optional().isIn(["low", "medium", "high"])
];

export const updateTicketValidator = [
  body("subject").optional().notEmpty(),
  body("description").optional().isLength({ min: 5 }),
  body("category").optional().isIn(["billing", "usage", "appliance", "account", "other"]),
  body("priority").optional().isIn(["low", "medium", "high"])
];

export const updateStatusValidator = [
  body("status").notEmpty().isIn(["open", "in_progress", "closed"])
];

export const addMessageValidator = [
  body("text").notEmpty().withMessage("text is required"),
  body("sender").optional().isIn(["user", "admin"])
];