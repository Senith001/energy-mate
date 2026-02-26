import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware.js";

import {
  generateEnergyTips,
  generateCostStrategies,
  generatePredictions,

  adminCreateTemplate,
  adminListTemplates,
  adminGetTemplate,
  adminUpdateTemplate,
  adminDeleteTemplate,

  userListTemplates,
  userUpdateTemplateStatus,
} from "../controllers/recommendationController.js";

const router = express.Router();

// ================= AI (Gemini) =================
router.post("/households/:householdId/ai/energy-tips", protect, generateEnergyTips);
router.post("/households/:householdId/ai/cost-strategies", protect, generateCostStrategies);
router.post("/households/:householdId/ai/predictions", protect, generatePredictions);

// ============== ADMIN: Template CRUD ==============
router.post("/admin/templates", protect, authorize("admin"), adminCreateTemplate);
router.get("/admin/templates", protect, authorize("admin"), adminListTemplates);
router.get("/admin/templates/:id", protect, authorize("admin"), adminGetTemplate);
router.put("/admin/templates/:id", protect, authorize("admin"), adminUpdateTemplate);
router.delete("/admin/templates/:id", protect, authorize("admin"), adminDeleteTemplate);

// ============== USER: View + Status ==============
router.get("/households/:householdId/templates", protect, userListTemplates);
router.patch(
  "/households/:householdId/templates/:templateId/status",
  protect,
  userUpdateTemplateStatus
);

export default router;