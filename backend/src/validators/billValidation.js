import { body, param } from "express-validator";
import validate from "../middlewares/validate.js";
import { idParamRule, monthlyQueryRules } from "./usageValidation.js";

// Bill: create / generate
const createBillRules = [
  body("householdId")
    .notEmpty().withMessage("householdId is required")
    .isMongoId().withMessage("householdId must be a valid Mongo ID"),
  body("month")
    .notEmpty().withMessage("month is required")
    .isInt({ min: 1, max: 12 }).withMessage("month must be 1-12"),
  body("year")
    .notEmpty().withMessage("year is required")
    .isInt({ min: 2000, max: 2100 }).withMessage("year must be between 2000 and 2100"),
  body("totalUnits")
    .optional()
    .isFloat({ min: 0 }).withMessage("totalUnits must be a non-negative number"),
  body("previousReading")
    .optional()
    .isFloat({ min: 0 }).withMessage("previousReading must be a non-negative number"),
  body("currentReading")
    .optional()
    .isFloat({ min: 0 }).withMessage("currentReading must be a non-negative number"),
  validate,
];

// Bill: update (mark paid, change due date)
const updateBillRules = [
  param("id").isMongoId().withMessage("Invalid bill ID"),
  body("status")
    .optional()
    .isIn(["unpaid", "paid"]).withMessage("status must be 'unpaid' or 'paid'"),
  body("paidAt")
    .optional()
    .isISO8601().withMessage("paidAt must be a valid ISO-8601 date"),
  body("dueDate")
    .optional()
    .isISO8601().withMessage("dueDate must be a valid ISO-8601 date"),
  validate,
];

export {
  createBillRules,
  updateBillRules,
  idParamRule as billIdRule,
  monthlyQueryRules as comparisonQueryRules,
};
