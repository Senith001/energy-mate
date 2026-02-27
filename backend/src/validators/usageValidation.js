import { body, param, query } from "express-validator";
import validate from "../middlewares/validate.js";

// Usage: create
const createUsageRules = [
  body("householdId")
    .notEmpty().withMessage("householdId is required")
    .isMongoId().withMessage("householdId must be a valid Mongo ID"),
  body("date")
    .notEmpty().withMessage("date is required")
    .isISO8601().withMessage("date must be a valid ISO-8601 date"),
  body("entryType")
    .optional()
    .isIn(["manual", "meter"]).withMessage("entryType must be 'manual' or 'meter'"),
  body("unitsUsed")
    .optional()
    .isFloat({ min: 0 }).withMessage("unitsUsed must be a non-negative number"),
  body("previousReading")
    .optional()
    .isFloat({ min: 0 }).withMessage("previousReading must be a non-negative number"),
  body("currentReading")
    .optional()
    .isFloat({ min: 0 }).withMessage("currentReading must be a non-negative number"),
  
  // Custom validation: require either unitsUsed OR both readings
  body().custom((value) => {
    const { unitsUsed, previousReading, currentReading } = value;
    
    if (!unitsUsed && (!previousReading || !currentReading)) {
      throw new Error("Provide either unitsUsed OR both previousReading and currentReading");
    }
      return true;
    }),
  validate,
];

// Usage: update
const updateUsageRules = [
  param("id").isMongoId().withMessage("Invalid usage ID"),
  body("date")
    .optional()
    .isISO8601().withMessage("date must be a valid ISO-8601 date"),
  body("entryType")
    .optional()
    .isIn(["manual", "meter"]).withMessage("entryType must be 'manual' or 'meter'"),
  body("unitsUsed")
    .optional()
    .isFloat({ min: 0 }).withMessage("unitsUsed must be a non-negative number"),
  body("previousReading")
    .optional()
    .isFloat({ min: 0 }).withMessage("previousReading must be a non-negative number"),
  body("currentReading")
    .optional()
    .isFloat({ min: 0 }).withMessage("currentReading must be a non-negative number")
    .custom((value, { req }) => {
      // If both readings provided in update, currentReading must be >= previousReading
      if (req.body.previousReading !== undefined && value !== undefined) {
        if (value < req.body.previousReading) {
          throw new Error("currentReading must be >= previousReading");
        }
      }
      return true;
    }),
  validate,
];

// Param :id 
const idParamRule = [
  param("id").isMongoId().withMessage("Invalid ID"),
  validate,
];

// Monthly summary / estimate param
const monthlyQueryRules = [
  param("householdId")
    .notEmpty().withMessage("householdId param is required")
    .isMongoId().withMessage("householdId must be a valid Mongo ID"),
  query("month")
    .notEmpty().withMessage("month query param is required")
    .isInt({ min: 1, max: 12 }).withMessage("month must be 1-12"),
  query("year")
    .notEmpty().withMessage("year query param is required")
    .isInt({ min: 2000, max: 2100 }).withMessage("year must be between 2000 and 2100"),
  validate,
];

// Weather impact param
const weatherImpactRules = [
  param("householdId")
    .notEmpty().withMessage("householdId param is required")
    .isMongoId().withMessage("householdId must be a valid Mongo ID"),
  query("month")
    .notEmpty().withMessage("month query param is required")
    .isInt({ min: 1, max: 12 }).withMessage("month must be 1-12"),
  query("year")
    .notEmpty().withMessage("year query param is required")
    .isInt({ min: 2000, max: 2100 }).withMessage("year must be between 2000 and 2100"),
  query("city")
    .optional()
    .isString().withMessage("city must be a string"),
  validate,
];

export {
  validate,
  createUsageRules,
  updateUsageRules,
  idParamRule,
  monthlyQueryRules,
  weatherImpactRules,
};
