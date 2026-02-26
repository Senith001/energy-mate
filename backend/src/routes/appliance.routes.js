import express from "express";
const router = express.Router();

import * as applianceController from "../controllers/appliance.controller.js";
import validate from "../middlewares/validate.middleware.js";
import { createApplianceValidator, updateApplianceValidator } from "../validators/appliance.validator.js";

router.post("/households/:householdId/appliances", createApplianceValidator, validate, applianceController.createAppliance);
router.get("/households/:householdId/appliances", applianceController.getAppliancesByHousehold);
router.get("/households/:householdId/appliances/:applianceId", applianceController.getApplianceById);
router.put("/households/:householdId/appliances/:applianceId", updateApplianceValidator, validate, applianceController.updateAppliance);
router.delete("/households/:householdId/appliances/:applianceId", applianceController.deleteAppliance);

export default router;