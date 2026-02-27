import Usage from "../models/usage.js";
import Household from "../models/Household.js";
import { success, error } from "../utils/responseFormatter.js";
import { getMonthlyCostSummary } from "../services/usageService.js";
import { getCurrentWeather } from "../services/openWeatherService.js";

// Verify user owns the household 
async function verifyHouseholdOwnership(householdId, userId) {
  const household = await Household.findOne({ _id: householdId, userId });
  return household;
}

// CREATE/ADD USAGE
async function createUsage(req, res) {
  try {
    const { householdId, date, entryType, unitsUsed, previousReading, currentReading } = req.body;

    // Verify user owns the household
    const household = await verifyHouseholdOwnership(householdId, req.user._id);
    if (!household) {
      return error(res, "Household not found or access denied", 403);
    }

    const usage = new Usage({
      householdId,
      date,
      entryType,
      unitsUsed,
      previousReading,
      currentReading,
    });

    const saved = await usage.save();
    return success(res, saved, "Usage created", 201);
  } catch (err) {
    if (err.code === 11000) {
      return error(res, "Duplicate usage entry for the given household and date", 409);
    }
    return error(res, "Server error", 500, err.message);
  }
}

// READ ALL 
async function getUsages(req, res) {
  try {
    // Get all households owned by the user
    const userHouseholds = await Household.find({ owner: req.user._id }).select("_id");
    const householdIds = userHouseholds.map((h) => h._id);

    const filter = { householdId: { $in: householdIds } };
    // If specific householdId provided, verify ownership
    if (req.query.householdId) {
      if (!householdIds.some((id) => id.toString() === req.query.householdId)) {
        return error(res, "Household not found or access denied", 403);
      }
      filter.householdId = req.query.householdId;
    }

    const usages = await Usage.find(filter);

    return success(res, usages, "Usages fetched");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// READ ONE
async function getUsageById(req, res) {
  try {
    const usage = await Usage.findById(req.params.id);
    if (!usage) return error(res, "Usage not found", 404);

    // Verify ownership
    const household = await verifyHouseholdOwnership(usage.householdId, req.user._id);
    if (!household) {
      return error(res, "Access denied", 403);
    }

    return success(res, usage, "Usage fetched");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// UPDATE
async function updateUsage(req, res) {
  try {
    // First find the usage to verify ownership
    const existingUsage = await Usage.findById(req.params.id);
    if (!existingUsage) return error(res, "Usage not found", 404);

    // Verify ownership
    const household = await verifyHouseholdOwnership(existingUsage.householdId, req.user._id);
    if (!household) {
      return error(res, "Access denied", 403);
    }

    const allowedFields = ["date", "entryType", "unitsUsed", "previousReading", "currentReading"];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return error(res, "No valid fields to update", 400);
    }

    const usage = await Usage.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    return success(res, usage, "Usage updated");
  } catch (err) {
    if (err.code === 11000) {
      return error(res, "Duplicate usage entry for the given household and date", 409);
    }
    return error(res, "Server error", 500, err.message);
  }
}

// DELETE 
async function deleteUsage(req, res) {
  try {
    const usage = await Usage.findById(req.params.id);
    if (!usage) return error(res, "Usage not found", 404);

    // Verify ownership
    const household = await verifyHouseholdOwnership(usage.householdId, req.user._id);
    if (!household) {
      return error(res, "Access denied", 403);
    }

    await Usage.findByIdAndDelete(req.params.id);
    return success(res, usage, "Usage deleted");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// MONTHLY USAGE SUMMARY 
async function getMonthlySummary(req, res) {
  try {
    const { householdId, month, year } = req.query;

    // Verify ownership
    const household = await verifyHouseholdOwnership(householdId, req.user._id);
    if (!household) {
      return error(res, "Household not found or access denied", 403);
    }

    const summary = await getMonthlyCostSummary(householdId, Number(month), Number(year));

    return success(
      res,
      { householdId, month: Number(month), year: Number(year), ...summary },
      "Monthly summary fetched"
    );
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// ESTIMATE COST
async function estimateCost(req, res) {
  try {
    const { householdId, month, year } = req.query;

    // Verify ownership
    const household = await verifyHouseholdOwnership(householdId, req.user._id);
    if (!household) {
      return error(res, "Household not found or access denied", 403);
    }

    const costInfo = await getMonthlyCostSummary(householdId, Number(month), Number(year));

    return success(res, costInfo, "Cost estimated");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// WEATHER IMPACT (third-party API integration) 
async function getWeatherImpact(req, res) {
  try {
    const { householdId, month, year, city } = req.query;

    // Verify ownership
    const household = await verifyHouseholdOwnership(householdId, req.user._id);
    if (!household) {
      return error(res, "Household not found or access denied", 403);
    }

    // Get usage summary with cost for the month (using shared helper)
    const summary = await getMonthlyCostSummary(householdId, Number(month), Number(year));

    // Fetch current weather from OpenWeatherMap (third-party API)
    const weather = await getCurrentWeather(city || "Colombo");

    // Simple insight based on temperature
    let insight;
    if (weather.temperature > 30) {
      insight = "High temperatures detected. Expect increased electricity usage due to cooling appliances.";
    } else if (weather.temperature > 25) {
      insight = "Moderate temperatures. Electricity usage should be average.";
    } else {
      insight = "Cool temperatures. Lower electricity usage expected from cooling appliances.";
    }

    return success(
      res,
      { usage: summary, weather, insight },
      "Weather impact analysis"
    );
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return error(res, "City not found. Please provide a valid city name.", 400);
    }
    return error(res, "Server error", 500, err.message);
  }
}

export {
  createUsage,
  getUsages,
  getUsageById,
  updateUsage,
  deleteUsage,
  getMonthlySummary,
  estimateCost,
  getWeatherImpact,
};
