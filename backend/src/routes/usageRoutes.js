import express from "express";
import {
  createUsage,
  getUsages,
  getUsageById,
  updateUsage,
  deleteUsage,
  getMonthlySummary,
  estimateCost,
  getWeatherImpact,
} from "../controllers/usageController.js";
import {
  createUsageRules,
  updateUsageRules,
  idParamRule,
  monthlyQueryRules,
  weatherImpactRules,
} from "../validators/usageValidation.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

//create
router.post("/",               protect, createUsageRules,  createUsage);

//read
router.get("/",                           protect,                    getUsages);
router.get("/:id",             protect, idParamRule,       getUsageById);
router.get("/households/:householdId/monthly-summary", protect, monthlyQueryRules, getMonthlySummary);
router.get("/households/:householdId/estimate",        protect, monthlyQueryRules, estimateCost);
router.get("/households/:householdId/weather-impact",  protect, weatherImpactRules, getWeatherImpact);

//update
router.patch("/:id",             protect, updateUsageRules,  updateUsage);

//delete
router.delete("/:id",          protect, idParamRule,       deleteUsage);

export default router;
