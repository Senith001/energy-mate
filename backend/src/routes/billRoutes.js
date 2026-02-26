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

router.post("/",             protect, createBillRules, createBill);           // user enters units or readings
router.post("/generate",     protect, createBillRules, generateBillFromUsage); // auto from usage records
router.get("/",              protect, getBills);
router.get("/compare",       protect, comparisonQueryRules, getComparison);
router.get("/:id",           protect, billIdRule, getBillById);
router.put("/:id",           protect, updateBillRules, updateBill);
router.put("/:id/regenerate",protect, billIdRule, regenerateBill);
router.delete("/:id",        protect, authorize("admin"), billIdRule, deleteBill);

export default router;
