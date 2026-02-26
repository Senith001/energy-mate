import { body } from "express-validator";

export const createApplianceValidator = [
  body("name").notEmpty().withMessage("name is required"),
  body("wattage").isFloat({ min: 1 }).withMessage("wattage must be >= 1"),
  body("quantity").optional().isInt({ min: 1 }).withMessage("quantity must be >= 1"),
  body("defaultHoursPerDay").optional().isFloat({ min: 0, max: 24 }).withMessage("defaultHoursPerDay must be 0-24"),
  body("roomId").optional({ nullable: true }).isString().withMessage("roomId must be a string")
];

export const updateApplianceValidator = [
  body("name").optional().notEmpty(),
  body("wattage").optional().isFloat({ min: 1 }),
  body("quantity").optional().isInt({ min: 1 }),
  body("defaultHoursPerDay").optional().isFloat({ min: 0, max: 24 })
];