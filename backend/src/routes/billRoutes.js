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

router.post("/",             protect, authorize("admin"), createBillRules, createBill);           // user enters units or readings
router.post("/generate",     protect, authorize("admin"), createBillRules, generateBillFromUsage); // auto from usage records
router.get("/",              protect, authorize("admin"), getBills);
router.get("/compare",       protect, authorize("admin"), comparisonQueryRules, getComparison);
router.get("/:id",           protect, authorize("admin"), billIdRule, getBillById);
router.put("/:id",           protect, authorize("admin"), updateBillRules, updateBill);
router.put("/:id/regenerate",protect, authorize("admin"), billIdRule, regenerateBill);
router.delete("/:id",        protect, authorize("admin"), billIdRule, deleteBill);

export default router;
