import express from "express";
const router = express.Router();

import * as roomController from "../controllers/room.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createRoomValidator, updateRoomValidator } from "../validators/room.validator.js";

router.post("/households/:householdId/rooms", createRoomValidator, validate, roomController.createRoom);
router.get("/households/:householdId/rooms", roomController.getRoomsByHousehold);
router.put("/households/:householdId/rooms/:roomId", updateRoomValidator, validate, roomController.updateRoom);
router.delete("/households/:householdId/rooms/:roomId", roomController.deleteRoom);

export default router;