import express from "express";
import { verifyToken, requireRole } from "../middlewares/auth.js";

import {
  // AI
  generateEnergyTips,
  generateCostStrategies,
  generatePredictions,

  // Admin Templates CRUD
  adminCreateTemplate,
  adminListTemplates,
  adminGetTemplate,
  adminUpdateTemplate,
  adminDeleteTemplate,

  // User view + status
  userListTemplates,
  userUpdateTemplateStatus,
} from "../controllers/recommendationController.js";

const router = express.Router();

// ================= AI (Gemini) =================
router.post("/households/:householdId/ai/energy-tips", verifyToken, generateEnergyTips);
router.post("/households/:householdId/ai/cost-strategies", verifyToken, generateCostStrategies);
router.post("/households/:householdId/ai/predictions", verifyToken, generatePredictions);

// ============== ADMIN: Template CRUD ==============
router.post("/admin/templates", verifyToken, requireRole("admin"), adminCreateTemplate);
router.get("/admin/templates", verifyToken, requireRole("admin"), adminListTemplates);
router.get("/admin/templates/:id", verifyToken, requireRole("admin"), adminGetTemplate);
router.put("/admin/templates/:id", verifyToken, requireRole("admin"), adminUpdateTemplate);
router.delete("/admin/templates/:id", verifyToken, requireRole("admin"), adminDeleteTemplate);

// ============== USER: View + Status ==============
router.get("/households/:householdId/templates", verifyToken, userListTemplates);
router.patch("/households/:householdId/templates/:templateId/status", verifyToken, userUpdateTemplateStatus);

export default router;