import rf from "../utils/responseFormatter.js";

import Household from "../models/household.js";
import Bill from "../models/bill.js";
import Appliance from "../models/Appliance.js";

import RecommendationTemplate from "../models/RecommendationTemplate.js";
import RecommendationStatus from "../models/RecommendationStatus.js";

import {
  getEnergyTipsFromGemini,
  getCostStrategiesFromGemini,
  getPredictionFromGemini,
} from "../services/geminiService.js";

// ===== helpers =====
async function verifyHouseholdOwnership(householdId, userId) {
  return Household.findOne({ _id: householdId, owner: userId });
}

async function buildAiInputs(householdId) {
  const [bills, appliances] = await Promise.all([
    Bill.find({ householdId })
      .sort({ year: 1, month: 1 })
      .select("month year totalUnits totalCost previousReading currentReading")
      .lean(),
    Appliance.find({ householdId })
      .select("name category wattage quantity defaultHoursPerDay efficiencyRating")
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
    name: a.name,
    category: a.category,
    wattage: a.wattage,
    quantity: a.quantity,
    usedHoursPerDay: a.defaultHoursPerDay,
    efficiencyRating: a.efficiencyRating,
  }));

  return { billHistory, applianceUsage };
}

// =========================
// AI ENDPOINTS (no DB CRUD)
// Base: /api/recommendations/households/:householdId/ai/...
// =========================
export async function generateEnergyTips(req, res) {
  try {
    const { householdId } = req.params;
    if (!req.user?.id) return rf.error(res, "Unauthorized", 401);

    const household = await verifyHouseholdOwnership(householdId, req.user.id);
    if (!household) return rf.error(res, "Household not found or access denied", 403);

    const { billHistory, applianceUsage } = await buildAiInputs(householdId);
    if (!billHistory.length) return rf.error(res, "No bill history found", 404);

    const tips = await getEnergyTipsFromGemini(billHistory, applianceUsage);
    return rf.success(res, { tips }, "Energy tips generated");
  } catch (err) {
    return rf.error(res, "Failed to generate energy tips", 500, err.message);
  }
}

export async function generateCostStrategies(req, res) {
  try {
    const { householdId } = req.params;
    if (!req.user?.id) return rf.error(res, "Unauthorized", 401);

    const household = await verifyHouseholdOwnership(householdId, req.user.id);
    if (!household) return rf.error(res, "Household not found or access denied", 403);

    const { billHistory, applianceUsage } = await buildAiInputs(householdId);
    if (!billHistory.length) return rf.error(res, "No bill history found", 404);

    const strategies = await getCostStrategiesFromGemini(billHistory, applianceUsage);
    return rf.success(res, { strategies }, "Cost strategies generated");
  } catch (err) {
    return rf.error(res, "Failed to generate strategies", 500, err.message);
  }
}

export async function generatePredictions(req, res) {
  try {
    const { householdId } = req.params;
    if (!req.user?.id) return rf.error(res, "Unauthorized", 401);

    const household = await verifyHouseholdOwnership(householdId, req.user.id);
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
    return rf.error(res, "Failed to generate prediction", 500, err.message);
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