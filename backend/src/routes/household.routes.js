import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  createHousehold,
  getAllHouseholds,
  getHouseholdById,
  updateHousehold,
  deleteHousehold,
  updateHouseholdSettings,
  getHouseholdWeather,
} from "../controllers/household.controller.js";

const router = express.Router();

router.use(protect);

router.post("/", createHousehold);
router.get("/", getAllHouseholds);

router.patch("/:id/settings", updateHouseholdSettings);
router.get("/:id/weather", getHouseholdWeather);

router.get("/:id", getHouseholdById);
router.put("/:id", updateHousehold);
router.delete("/:id", deleteHousehold);

export default router;