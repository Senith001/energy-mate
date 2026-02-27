import mongoose from "mongoose";
import Bill from "../models/bill.js";
import { success, error } from "../utils/responseFormatter.js";
import { createUserBill, generateBill, compareBills } from "../services/billService.js";
import { verifyHouseholdOwnership } from "../services/usageService.js";

// CREATE BILL (user enters units or readings)
async function createBill(req, res) {
  try {
    const { householdId, month, year, totalUnits, previousReading, currentReading } = req.body;

    // Verify ownership only for normal users
    if (req.user && req.user.role === "user") {
      const household = await verifyHouseholdOwnership(householdId, req.user._id);
      if (!household) return error(res, "Household not found or access denied", 403);
    }

    const bill = await createUserBill({
      householdId,
      month: Number(month),
      year: Number(year),
      totalUnits: totalUnits !== undefined ? Number(totalUnits) : undefined,
      previousReading: previousReading !== undefined ? Number(previousReading) : undefined,
      currentReading: currentReading !== undefined ? Number(currentReading) : undefined,
    });
    return success(res, bill, "Bill created", 201);
  } catch (err) {
    return error(res, err.message, 400);
  }
}

// GENERATE BILL (auto from usage records)
async function generateBillFromUsage(req, res) {
  try {
    const { householdId } = req.params;
    const { month, year } = req.query;

    if (req.user && req.user.role === "user") {
      const household = await verifyHouseholdOwnership(householdId, req.user._id);
      if (!household) return error(res, "Household not found or access denied", 403);
    }

    const bill = await generateBill(householdId, Number(month), Number(year));
    return success(res, bill, "Bill generated", 201);
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// GET ALL BILLS 
async function getBills(req, res) {
  try {
    const { householdId } = req.params;

    let filter = {};

    // Admin sees all bills
    if (req.user.role === "admin") {
      // If admin specifies householdId, filter by it
      if (householdId) {
        filter.householdId = householdId;
      }
    } else {
      // Users must provide householdId and can only see their own
      if (!householdId) {
        return error(res, "householdId is required", 400);
      }

      // Verify user owns this household
      const household = await verifyHouseholdOwnership(householdId, req.user._id);
      if (!household) {
        return error(res, "Access denied", 403);
      }

      filter.householdId = householdId;
    }

    const bills = await Bill.find(filter).sort({ year: -1, month: -1 });

    return success(res, bills, "Bills fetched");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// GET BILL BY ID
async function getBillById(req, res) {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return error(res, "Bill not found", 404);

    if (req.user && req.user.role === "user") {
      const household = await verifyHouseholdOwnership(bill.householdId, req.user._id);
      if (!household) return error(res, "Access denied", 403);
    }

    return success(res, bill, "Bill fetched");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// UPDATE BILL (user can re-enter units or readings)
async function updateBill(req, res) {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return error(res, "Bill not found", 404);

    if (req.user && req.user.role === "user") {
      const household = await verifyHouseholdOwnership(bill.householdId, req.user._id);
      if (!household) return error(res, "Access denied", 403);
    }

    const { totalUnits, previousReading, currentReading, month, year, status, paidAt } = req.body;

    // Calculate totalUnits from readings if provided
    let newTotalUnits = totalUnits;
    if (totalUnits === undefined || totalUnits === null) {
      if (previousReading !== undefined && currentReading !== undefined) {
        if (currentReading < previousReading) {
          return error(res, "currentReading must be greater than previousReading", 400);
        }
        newTotalUnits = currentReading - previousReading;
      }
    }

    // Prepare updates
    const updates = {};
    if (newTotalUnits !== undefined) updates.totalUnits = Number(newTotalUnits);
    if (previousReading !== undefined) updates.previousReading = Number(previousReading);
    if (currentReading !== undefined) updates.currentReading = Number(currentReading);
    if (month !== undefined) updates.month = Number(month);
    if (year !== undefined) updates.year = Number(year);
    if (status !== undefined) updates.status = status;
    if (paidAt !== undefined) updates.paidAt = paidAt;

    const updatedBill = await Bill.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    return success(res, updatedBill, "Bill updated");
  } catch (err) {
    return error(res, err.message, 400);
  }
}

// DELETE BILL 
async function deleteBill(req, res) {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return error(res, "Bill not found", 404);

    await Bill.findByIdAndDelete(req.params.id);
    return success(res, bill, "Bill deleted");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// COMPARE CURRENT vs PREVIOUS MONTH 
async function getComparison(req, res) {
  try {
    const { householdId } = req.params;
    const { month, year } = req.query;

    if (req.user && req.user.role === "user") {
      const household = await verifyHouseholdOwnership(householdId, req.user._id);
      if (!household) return error(res, "Household not found or access denied", 403);
    }

    const comparison = await compareBills(householdId, Number(month), Number(year));
    return success(res, comparison, "Bill comparison");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

// REGENERATE BILL (recalculate from latest usage data) 
async function regenerateBill(req, res) {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return error(res, "Bill not found", 404);

    if (req.user && req.user.role === "user") {
      const household = await verifyHouseholdOwnership(bill.householdId, req.user._id);
      if (!household) return error(res, "Access denied", 403);
    }

    const updated = await generateBill(bill.householdId.toString(), bill.month, bill.year);
    return success(res, updated, "Bill regenerated");
  } catch (err) {
    return error(res, "Server error", 500, err.message);
  }
}

export {
  createBill,
  generateBillFromUsage,
  getBills,
  getBillById,
  updateBill,
  deleteBill,
  getComparison,
  regenerateBill,
};
