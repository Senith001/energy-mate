import express from "express";
import { viewTariff, editTariff } from "../controllers/tariffController.js";
import { updateTariffRules } from "../validators/tariffValidation.js";
import { protect, authorize } from "../middlewares/auth.middleware.js"; // add your auth middleware

const router = express.Router();

router.get("/",             viewTariff);   // anyone can view
router.put("/",  protect, authorize("admin"), updateTariffRules, editTariff);  // admin only

export default router;
