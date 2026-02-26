import express from "express";
const router = express.Router();

import * as supportController from "../controllers/supportTicket.controller.js";
import validate from "../middlewares/validate.middleware.js";
import {
  createTicketValidator,
  updateTicketValidator,
  updateStatusValidator,
  addMessageValidator
} from "../validators/supportTicket.validator.js";

router.post("/", createTicketValidator, validate, supportController.createTicket);
router.get("/", supportController.getAllTickets);

router.patch("/:id/status", updateStatusValidator, validate, supportController.updateTicketStatus);
router.post("/:id/messages", addMessageValidator, validate, supportController.addMessage);

router.get("/:id", supportController.getTicketById);
router.put("/:id", updateTicketValidator, validate, supportController.updateTicket);
router.delete("/:id", supportController.deleteTicket);

export default router;