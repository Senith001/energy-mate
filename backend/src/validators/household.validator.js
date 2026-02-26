import { body } from "express-validator";

export const createHouseholdValidator = [
  body("name").notEmpty().withMessage("name is required"),
  body("city").notEmpty().withMessage("city is required"),
  body("occupants").isInt({ min: 1 }).withMessage("occupants must be >= 1"),
  body("monthlyKwhTarget").optional().isFloat({ min: 0 }).withMessage("monthlyKwhTarget must be >= 0"),
  body("monthlyCostTarget").optional().isFloat({ min: 0 }).withMessage("monthlyCostTarget must be >= 0"),
  body("currency").optional().isString().isLength({ min: 2, max: 10 }).withMessage("currency invalid")
];

export const updateHouseholdValidator = [
  body("name").optional().notEmpty(),
  body("city").optional().notEmpty(),
  body("occupants").optional().isInt({ min: 1 }),
  body("monthlyKwhTarget").optional().isFloat({ min: 0 }),
  body("monthlyCostTarget").optional().isFloat({ min: 0 }),
  body("currency").optional().isString().isLength({ min: 2, max: 10 })
];

export const updateSettingsValidator = [
  body("monthlyKwhTarget").optional().isFloat({ min: 0 }).withMessage("monthlyKwhTarget must be >= 0"),
  body("monthlyCostTarget").optional().isFloat({ min: 0 }).withMessage("monthlyCostTarget must be >= 0"),
  body("currency").optional().isString().isLength({ min: 2, max: 10 }).withMessage("currency invalid")
];