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

router.post("/",               protect, createUsageRules,  createUsage);
router.get("/",                protect,                    getUsages);
router.get("/monthly-summary", protect, monthlyQueryRules, getMonthlySummary);
router.get("/estimate",        protect, monthlyQueryRules, estimateCost);
router.get("/weather-impact",  protect, weatherImpactRules, getWeatherImpact);
router.get("/:id",             protect, idParamRule,       getUsageById);
router.put("/:id",             protect, updateUsageRules,  updateUsage);
router.delete("/:id",          protect, idParamRule,       deleteUsage);

export default router;
