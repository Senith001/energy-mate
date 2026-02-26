import { body } from "express-validator";
import validate from "../middlewares/validate.js";

const updateTariffRules = [
  body("tariffLow")
    .optional()
    .isArray({ min: 1 }).withMessage("tariffLow must be a non-empty array"),
  body("tariffHigh")
    .optional()
    .isArray({ min: 1 }).withMessage("tariffHigh must be a non-empty array"),
  body("ssclRate")
    .optional()
    .isFloat({ min: 0, max: 1 }).withMessage("ssclRate must be between 0 and 1"),
  validate,
];

export { updateTariffRules };
