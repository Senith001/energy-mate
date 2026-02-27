import Usage from "../models/usage.js";
import { success, error } from "../utils/responseFormatter.js";
import Household from "../models/Household.js";
import { getMonthlyCostSummary } from "../services/usageService.js";
import { getCurrentWeather } from "../services/openWeatherService.js";
import { verifyHouseholdOwnership } from "../services/usageService.js";

// CREATE/ADD USAGE
async function createUsage(req, res) {
  try {
    let { householdId, date, entryType, unitsUsed, previousReading, currentReading } = req.body;

    // Check user role and ownership
    if (req.user && req.user.role === "user") {
      const household = await verifyHouseholdOwnership(householdId, req.user._id);
      if (!household) return error(res, "Household not found or access denied", 403);
    }

    // Calculate unitsUsed if readings provided
    if (!unitsUsed && previousReading !== undefined && currentReading !== undefined) {
      unitsUsed = currentReading - previousReading;
      
      if (unitsUsed < 0) {
        return error(res, "currentReading must be greater than previousReading", 400);
      }
    }

    const usage = new Usage({
      householdId,
      date,
      entryType: entryType || "manual", 
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
    const userHouseholds = await Household.find({ userId: req.user._id }).select("_id");
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

    if (req.user && req.user.role === "user") {
      const household = await verifyHouseholdOwnership(usage.householdId, req.user._id);
      if (!household) return error(res, "Access denied", 403);
    }

    return success(res, usage, "Usage fetched");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// UPDATE
async function updateUsage(req, res) {
  try {
    const existingUsage = await Usage.findById(req.params.id);
    if (!existingUsage) return error(res, "Usage not found", 404);

    if (req.user && req.user.role === "user") {
      const household = await verifyHouseholdOwnership(existingUsage.householdId, req.user._id);
      if (!household) return error(res, "Access denied", 403);
    }

    const { currentReading, previousReading, unitsUsed } = req.body;

    // Update both readings if provided
    if (previousReading !== undefined) {
      existingUsage.previousReading = previousReading;
    }

    if (currentReading !== undefined) {
      existingUsage.currentReading = currentReading;
    }

    // Recalculate unitsUsed from readings
    if ((previousReading !== undefined || currentReading !== undefined) && 
        existingUsage.previousReading !== undefined && 
        existingUsage.currentReading !== undefined) {
      const calculated = existingUsage.currentReading - existingUsage.previousReading;
      
      if (calculated < 0) {
        return error(res, "currentReading must be greater than previousReading", 400);
      }
      
      existingUsage.unitsUsed = calculated;
    } else if (unitsUsed !== undefined) {
      // ✅ Or update unitsUsed directly
      existingUsage.unitsUsed = unitsUsed;
    }

    const updated = await existingUsage.save();
    return success(res, updated, "Usage updated");
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

    if (req.user && req.user.role === "user") {
      const household = await verifyHouseholdOwnership(usage.householdId, req.user._id);
      if (!household) return error(res, "Access denied", 403);
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
    const { householdId, month, year } = req.params;
    const { month: queryMonth, year: queryYear } = req.query;

    if (req.user && req.user.role === "user") {
      const household = await verifyHouseholdOwnership(householdId, req.user._id);
      if (!household) return error(res, "Household not found or access denied", 403);
    }

    const summary = await getMonthlyCostSummary(householdId, Number(queryMonth), Number(queryYear));
    return success(res, { householdId, month: Number(queryMonth), year: Number(queryYear), ...summary }, "Monthly summary fetched");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// ESTIMATE COST
async function estimateCost(req, res) {
  try {
    const { householdId, month, year } = req.params;
    const { month: queryMonth, year: queryYear } = req.query;

    if (req.user && req.user.role === "user") {
      const household = await verifyHouseholdOwnership(householdId, req.user._id);
      if (!household) return error(res, "Household not found or access denied", 403);
    }

    const costInfo = await getMonthlyCostSummary(householdId, Number(queryMonth), Number(queryYear));
    return success(res, costInfo, "Cost estimated");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// WEATHER IMPACT (third-party API integration) 
async function getWeatherImpact(req, res) {
  try {
    const { householdId, month, year } = req.params;
    const { city } = req.query;

    if (req.user && req.user.role === "user") {
      const household = await verifyHouseholdOwnership(householdId, req.user._id);
      if (!household) return error(res, "Household not found or access denied", 403);
    }

    const summary = await getMonthlyCostSummary(householdId, Number(month), Number(year));
    const weather = await getCurrentWeather(city || "Colombo");

    let insight;
    if (weather.temperature > 30) {
      insight = "High temperatures detected. Expect increased electricity usage due to cooling appliances.";
    } else if (weather.temperature > 25) {
      insight = "Moderate temperatures. Electricity usage should be average.";
    } else {
      insight = "Cool temperatures. Lower electricity usage expected from cooling appliances.";
    }

    return success(res, { usage: summary, weather, insight }, "Weather impact analysis");
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
