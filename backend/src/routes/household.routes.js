import express from "express";
const router = express.Router();

import * as householdController from "../controllers/household.controller.js";
import validate from "../middlewares/validate.middleware.js";
import {
  createHouseholdValidator,
  updateHouseholdValidator,
  updateSettingsValidator
} from "../validators/household.validator.js";

router.post("/", createHouseholdValidator, validate, householdController.createHousehold);
router.get("/", householdController.getAllHouseholds);

router.patch("/:id/settings", updateSettingsValidator, validate, householdController.updateHouseholdSettings);
router.get("/:id/weather", householdController.getHouseholdWeather);

router.get("/:id", householdController.getHouseholdById);
router.put("/:id", updateHouseholdValidator, validate, householdController.updateHousehold);
router.delete("/:id", householdController.deleteHousehold);

export default router;