import Usage from "../models/usage.js";
import mongoose from "mongoose";
import { getTariff } from "./tarifService.js";
import Household from "../models/Household.js";

// Two tiers:
//   Tier A  – Consumption of 0–60 kWh per month
//   Tier B  – Consumption above 60 kWh per month
// Fixed charge is determined by the highest block reached.

/**
 * Calculate electricity cost using CEB domestic slab tariff + SSCL.
 * @param {number} totalUnits – kWh consumed in the billing period
 * @param {object} tariff – tariff document fetched from DB via getTariff()
 * @returns {{ totalUnits, energyCharge, fixedCharge, subTotal, sscl, totalCost, breakdown }}
 */
function calculateCost(totalUnits, tariff) {
  const slabs = totalUnits <= 60 ? tariff.tariffLow : tariff.tariffHigh;

  let remaining = totalUnits;
  let energyCharge = 0;
  let fixedCharge = 0;
  const breakdown = [];
  let prevLimit = 0;

  for (const slab of slabs) {
    if (remaining <= 0) break;

    const upTo      = slab.upTo === null ? Infinity : slab.upTo; // null from DB → Infinity
    const slabWidth = upTo === Infinity ? remaining : upTo - prevLimit;
    const unitsInSlab = Math.min(remaining, slabWidth);
    const cost = +(unitsInSlab * slab.rate).toFixed(2);

    breakdown.push({
      range: `${prevLimit + 1}–${prevLimit + unitsInSlab} kWh`,
      units: unitsInSlab,
      rate: slab.rate,
      cost,
    });

    energyCharge += cost;
    // Fixed charge = highest block reached
    if (slab.fixedCharge > fixedCharge) fixedCharge = slab.fixedCharge;

    remaining -= unitsInSlab;
    prevLimit = upTo === Infinity ? prevLimit + unitsInSlab : upTo;
  }

  const subTotal = +(energyCharge + fixedCharge).toFixed(2);
  const sscl = +(subTotal * tariff.ssclRate).toFixed(2); // from DB
  const totalCost = +(subTotal + sscl).toFixed(2);

  return {
    totalUnits,
    energyCharge: +energyCharge.toFixed(2),
    fixedCharge,
    subTotal,
    sscl,
    totalCost,
    breakdown,
  };
}

/**
 * Aggregate total units for a household in a given month/year.
 * @param {string} householdId
 * @param {number} month  1-12
 * @param {number} year
 * @returns {Promise<number>} totalUnits
 */
async function getMonthlyTotalUnits(householdId, month, year) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999); // last ms of month

  const result = await Usage.aggregate([
    {
      $match: {
        householdId: new mongoose.Types.ObjectId(householdId),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalUnits: { $sum: "$unitsUsed" },
        entries: { $sum: 1 },
      },
    },
  ]);

  return result.length > 0 ? result[0] : { totalUnits: 0, entries: 0 };
}

/**
 * Combined helper: get monthly summary with cost calculation.
 * Reduces duplication between getMonthlySummary and estimateCost endpoints.
 */
async function getMonthlyCostSummary(householdId, month, year) {
  const [summary, tariff] = await Promise.all([
    getMonthlyTotalUnits(householdId, month, year),
    getTariff(), // fetch live tariff from DB
  ]);
  const costInfo = calculateCost(summary.totalUnits, tariff); // pass tariff in
  return { ...summary, ...costInfo };
}

/**
 * Verify ownership of a household by userId.
 * @param {string} householdId
 * @param {string} userId
 * @returns {Promise<object|null>} Household document if found, else null
 */
export async function verifyHouseholdOwnership(householdId, userId) {
  return await Household.findOne({ _id: householdId, userId });
}

export {
  calculateCost,
  getMonthlyTotalUnits,
  getMonthlyCostSummary,
};
