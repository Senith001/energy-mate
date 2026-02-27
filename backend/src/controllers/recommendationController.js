import mongoose from "mongoose";
import rf from "../utils/responseFormatter.js";

import Household from "../models/Household.js";
import Bill from "../models/bill.js";
import Appliance from "../models/Appliance.js";

import {
  getEnergyTipsFromGemini,
  getCostStrategiesFromGemini,
  getPredictionFromGemini,
} from "../services/geminiService.js";

/* ===================== HELPERS ===================== */
function getUserId(req) {
  // support both styles: _id (mongoose) OR id (string)
  return req.user?._id || req.user?.id || null;
}

export async function verifyHouseholdOwnership(householdId, userId) {
  if (!mongoose.Types.ObjectId.isValid(householdId)) return null;

  const household = await Household.findById(householdId).lean();
  if (!household) return null;

  const ownerId = household.userId?.toString();
  const requesterId = userId?.toString();

  if (!ownerId || !requesterId) return null;
  if (ownerId !== requesterId) return null;

  return household;
}

async function buildAiInputs(householdId) {
  const [bills, appliances] = await Promise.all([
    Bill.find({ householdId })
      .sort({ year: 1, month: 1 })
      .select("month year totalUnits totalCost previousReading currentReading")
      .lean(),
    
    Appliance.find({ householdId })
      .select("name wattage quantity defaultHoursPerDay category efficiencyRating")
      .lean(),
  ]);

  const billHistory = bills.map((b) => ({
    month: b.month,
    year: b.year,
    totalUnits: b.totalUnits,
    totalCost: b.totalCost,
    previousReading: b.previousReading ?? null,
    currentReading: b.currentReading ?? null,
  }));

  const applianceUsage = appliances.map((a) => ({
    name: a?.name ?? "Unknown",
    // these may be undefined if schema doesn't have them - that's OK
    category: a?.category ?? null,
    wattage: typeof a?.wattage === "number" ? a.wattage : null,
    quantity: typeof a?.quantity === "number" ? a.quantity : 1,
    usedHoursPerDay:
      typeof a?.defaultHoursPerDay === "number" ? a.defaultHoursPerDay : 0,
    efficiencyRating: a?.efficiencyRating ?? null,
  }));

  return { billHistory, applianceUsage };
}

/* =====================
   AI ENDPOINTS
   Base: /api/recommendations/households/:householdId/ai/...
===================== */

export async function generateEnergyTips(req, res) {
  try {
    const { householdId } = req.params;

    const userId = getUserId(req);
    if (!userId) return rf.error(res, "Unauthorized", 401);

    const household = await verifyHouseholdOwnership(householdId, userId);
    if (!household) return rf.error(res, "Household not found or access denied", 403);

    const { billHistory, applianceUsage } = await buildAiInputs(householdId);
    if (!billHistory.length) return rf.error(res, "No bill history found", 404);

    const tips = await getEnergyTipsFromGemini(billHistory, applianceUsage);
    return rf.success(res, { tips }, "Energy tips generated");
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota")) {
      return rf.error(res, "Gemini quota/rate limit exceeded. Try again in a few seconds.", 429, msg);
    }
    return rf.error(res, "Gemini AI failed to generate energy-saving tips", 502, msg);
  }
}

export async function generateCostStrategies(req, res) {
  try {
    const { householdId } = req.params;

    const userId = getUserId(req);
    if (!userId) return rf.error(res, "Unauthorized", 401);

    const household = await verifyHouseholdOwnership(householdId, userId);
    if (!household) return rf.error(res, "Household not found or access denied", 403);

    const { billHistory, applianceUsage } = await buildAiInputs(householdId);
    if (!billHistory.length) return rf.error(res, "No bill history found", 404);

    const strategy = await getCostStrategiesFromGemini(billHistory, applianceUsage);
    return rf.success(res, { strategy }, "Cost strategy generated");
  } catch (err) {
    const msg = String(err?.message || "");
    const raw = err?.raw || err?.failures || null; 

    
    if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota")) {
      return rf.error(res, "Gemini quota/rate limit exceeded. Try again later.", 429, msg);
    }

    
    const looksLikeTruncate =
      msg.toLowerCase().includes("unexpected end of json") ||
      msg.toLowerCase().includes("unexpected end of input") ||
      msg.toLowerCase().includes("non-json") ||
      msg.toLowerCase().includes("invalid strategy") ||
      msg.toLowerCase().includes("gemini failed to generate cost strategy");

    if (looksLikeTruncate) {
      
      return rf.error(
        res,
        "AI cost strategy generation failed due to invalid provider output. Please try again.",
        502,
        raw ? String(raw) : msg
      );
    }

    
    if (msg.includes("Gemini failed")) {
      return rf.error(
        res,
        "AI cost strategy generation temporarily unavailable due to provider limitations",
        503,
        JSON.stringify({
          provider: "Gemini",
          note: "Energy tips and predictions are available",
          detail: msg,
        })
      );
    }

    // Default
    return rf.error(res, "Failed to generate strategies", 502, msg);
  }
}
export async function generatePredictions(req, res) {
  try {
    const { householdId } = req.params;

    const userId = getUserId(req);
    if (!userId) return rf.error(res, "Unauthorized", 401);

    const household = await verifyHouseholdOwnership(householdId, userId);
    if (!household) return rf.error(res, "Household not found or access denied", 403);

    const bills = await Bill.find({ householdId })
      .sort({ year: 1, month: 1 })
      .select("month year totalUnits")
      .lean();

    if (!bills.length) return rf.error(res, "No bill history found", 404);

    const billHistory = bills.map((b) => ({
      month: b.month,
      year: b.year,
      consumption: b.totalUnits,
    }));

    const prediction = await getPredictionFromGemini(billHistory);
    return rf.success(res, { prediction }, "Prediction generated");
  } catch (err) {
    const msg = String(err?.message || "");
    if (msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota")) {
      return rf.error(res, "Gemini quota/rate limit exceeded. Try again later.", 429, msg);
    }
    return rf.error(res, "Failed to generate prediction", 502, msg);
  }
}
// =========================
// ADMIN CRUD: Template Library
// Base: /api/recommendations/admin/templates
// =========================
export async function adminCreateTemplate(req, res) {
  try {
    const created = await RecommendationTemplate.create(req.body);
    return rf.success(res, created, "Template created", 201);
  } catch (err) {
    return rf.error(res, err.message, 400);
  }
}

export async function adminListTemplates(req, res) {
  try {
    const rows = await RecommendationTemplate.find().sort({ isActive: -1, createdAt: -1 });
    return rf.success(res, rows, "Templates fetched");
  } catch (err) {
    return rf.error(res, "Server error", 500, err.message);
  }
}

export async function adminGetTemplate(req, res) {
  try {
    const row = await RecommendationTemplate.findById(req.params.id);
    if (!row) return rf.error(res, "Template not found", 404);
    return rf.success(res, row, "Template fetched");
  } catch (err) {
    return rf.error(res, "Server error", 500, err.message);
  }
}

export async function adminUpdateTemplate(req, res) {
  try {
    const updated = await RecommendationTemplate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return rf.error(res, "Template not found", 404);
    return rf.success(res, updated, "Template updated");
  } catch (err) {
    return rf.error(res, err.message, 400);
  }
}

export async function adminDeleteTemplate(req, res) {
  try {
    const deleted = await RecommendationTemplate.findByIdAndDelete(req.params.id);
    if (!deleted) return rf.error(res, "Template not found", 404);

    // clean statuses referencing this template (optional but nice)
    await RecommendationStatus.deleteMany({ templateId: deleted._id });

    return rf.success(res, deleted, "Template deleted");
  } catch (err) {
    return rf.error(res, "Server error", 500, err.message);
  }
}

// =========================
// USER VIEW + STATUS UPDATE
// Base: /api/recommendations/households/:householdId/templates
// =========================
export async function userListTemplates(req, res) {
  try {
    const { householdId } = req.params;
    if (!req.user?.id) return rf.error(res, "Unauthorized", 401);

    const household = await verifyHouseholdOwnership(householdId, req.user.id);
    if (!household) return rf.error(res, "Household not found or access denied", 403);

    const { category, priority } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    const [templates, statuses] = await Promise.all([
      RecommendationTemplate.find(filter).sort({ createdAt: -1 }).lean(),
      RecommendationStatus.find({ householdId }).lean(),
    ]);

    const statusMap = new Map(statuses.map((s) => [String(s.templateId), s.status]));

    const rows = templates.map((t) => ({
      ...t,
      status: statusMap.get(String(t._id)) || "active",
    }));

    return rf.success(res, rows, "Recommendations fetched");
  } catch (err) {
    return rf.error(res, "Server error", 500, err.message);
  }
}

export async function userUpdateTemplateStatus(req, res) {
  try {
    const { householdId, templateId } = req.params;
    const { status } = req.body;

    if (!req.user?.id) return rf.error(res, "Unauthorized", 401);

    const household = await verifyHouseholdOwnership(householdId, req.user.id);
    if (!household) return rf.error(res, "Household not found or access denied", 403);

    if (!["active", "applied", "dismissed"].includes(status)) {
      return rf.error(res, "Invalid status", 400);
    }

    const updated = await RecommendationStatus.findOneAndUpdate(
      { householdId, templateId },
      { status, updatedAt: new Date() },
      { upsert: true, new: true, runValidators: true }
    );

    return rf.success(res, updated, "Status updated");
  } catch (err) {
    return rf.error(res, "Server error", 500, err.message);
  }
}