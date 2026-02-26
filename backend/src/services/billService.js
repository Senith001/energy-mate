import Bill from "../models/bill.js";
import { calculateCost, getMonthlyTotalUnits } from "./usageService.js";
import { getTariff } from "./tarifService.js";

/**
 * Create a bill from user-entered data.
 * User provides EITHER totalUnits directly OR previousReading & currentReading.
 */
async function createUserBill({ householdId, month, year, totalUnits, previousReading, currentReading }) {
  // Calculate totalUnits from readings if not provided directly
  if (totalUnits === undefined || totalUnits === null) {
    if (previousReading === undefined || currentReading === undefined) {
      throw new Error("Provide either totalUnits or both previousReading and currentReading");
    }
    if (currentReading < previousReading) {
      throw new Error("currentReading must be greater than previousReading");
    }
    totalUnits = currentReading - previousReading;
  }

  const tariff = await getTariff();
  const { energyCharge, fixedCharge, subTotal, sscl, totalCost, breakdown } =
    calculateCost(totalUnits, tariff);

  const dueDate = new Date(year, month, 20);

  const bill = await Bill.findOneAndUpdate(
    { householdId, month, year },
    {
      previousReading: previousReading ?? null,
      currentReading: currentReading ?? null,
      totalUnits, energyCharge, fixedCharge, subTotal, sscl, totalCost, breakdown, dueDate,
      status: "unpaid", paidAt: null,
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return bill;
}

/**
 * Generate a bill for a household for a given month/year.
 * Auto-generates from usage records in DB.
 * @param {string} householdId
 * @param {number} month 1-12
 * @param {number} year
 * @returns {Promise<Object>} saved Bill document
 */
async function generateBill(householdId, month, year) {
  // Aggregate total units from usage records + fetch live tariff from DB in parallel
  const [{ totalUnits }, tariff] = await Promise.all([
    getMonthlyTotalUnits(householdId, month, year),
    getTariff(),
  ]);

  // Calculate cost using tariff from DB
  const { energyCharge, fixedCharge, subTotal, sscl, totalCost, breakdown } = calculateCost(totalUnits, tariff);

  // Due date = 20th of the following month
  const dueDate = new Date(year, month, 20); // month is 0-indexed, so month (1-12) becomes next month

  const bill = await Bill.findOneAndUpdate(
    { householdId, month, year },
    { totalUnits, energyCharge, fixedCharge, subTotal, sscl, totalCost, breakdown, dueDate, status: "unpaid", paidAt: null },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return bill;
}

/**
 * Compare current month bill with previous month for the same household.
 * @param {string} householdId
 * @param {number} month 1-12
 * @param {number} year
 * @returns {Promise<Object>} comparison data
 */
async function compareBills(householdId, month, year) {
  // Calculate previous month/year
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const [currentBill, previousBill] = await Promise.all([
    Bill.findOne({ householdId, month, year }),
    Bill.findOne({ householdId, month: prevMonth, year: prevYear }),
  ]);

  if (!currentBill) {
    return { message: "No bill found for the requested month" };
  }

  const comparison = {
    current: {
      month,
      year,
      totalUnits: currentBill.totalUnits,
      totalCost: currentBill.totalCost,
    },
    previous: previousBill
      ? {
          month: prevMonth,
          year: prevYear,
          totalUnits: previousBill.totalUnits,
          totalCost: previousBill.totalCost,
        }
      : null,
  };

  if (previousBill) {
    const unitsDiff = currentBill.totalUnits - previousBill.totalUnits;
    const costDiff = currentBill.totalCost - previousBill.totalCost;
    const unitsChangePercent =
      previousBill.totalUnits > 0
        ? +((unitsDiff / previousBill.totalUnits) * 100).toFixed(1)
        : null;
    const costChangePercent =
      previousBill.totalCost > 0
        ? +((costDiff / previousBill.totalCost) * 100).toFixed(1)
        : null;

    comparison.difference = {
      units: unitsDiff,
      cost: +costDiff.toFixed(2),
      unitsChangePercent,
      costChangePercent,
      trend: unitsDiff > 0 ? "increased" : unitsDiff < 0 ? "decreased" : "unchanged",
    };
  }

  return comparison;
}

export { createUserBill, generateBill, compareBills };
