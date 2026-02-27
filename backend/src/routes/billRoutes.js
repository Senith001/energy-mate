import express from "express";
import {
  createBill,
  generateBillFromUsage,
  getBills,
  getBillById,
  updateBill,
  deleteBill,
  getComparison,
  regenerateBill,
} from "../controllers/billController.js";
import { createBillRules, updateBillRules, billIdRule, comparisonQueryRules } from "../validators/billValidation.js";
import { protect, authorize } from "../middlewares/auth.middleware.js"; // auth middleware

const router = express.Router();

//create
router.post("/",             protect,  createBillRules, createBill);           // user enters units or readings
router.post("/households/:householdId/generate",     protect,  comparisonQueryRules, generateBillFromUsage); // auto from usage records

//read
router.get("/households/:householdId",              protect,  getBills);
router.get("/households/:householdId/compare",       protect,  comparisonQueryRules, getComparison);
router.get("/:id",           protect,  billIdRule, getBillById);

//update
router.patch("/:id",         protect,  updateBillRules, updateBill);
router.put("/:id/regenerate",protect, billIdRule, regenerateBill);

//delete
router.delete("/:id",        protect, authorize("admin"), billIdRule, deleteBill);

export default router;
