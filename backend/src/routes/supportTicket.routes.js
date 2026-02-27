import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";

import {
  createTicket,
  getMyTickets,
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  addMessage,
  deleteTicket,
} from "../controllers/supportTicket.controller.js";

import {
  createTicketValidator,
  ticketIdParamValidator,
  updateTicketStatusValidator,
  addMessageValidator,
} from "../validators/supportTicket.validator.js";

const router = express.Router();

// USER
router.post("/", protect, createTicketValidator, validate, createTicket);
router.get("/my", protect, getMyTickets);

// ADMIN
router.get("/", protect, authorize("admin"), getAllTickets);

// ADMIN OR OWNER
router.get("/:id", protect, ticketIdParamValidator, validate, getTicketById);
router.delete("/:id", protect, ticketIdParamValidator, validate, deleteTicket);

// ADMIN ONLY UPDATE STATUS
router.patch(
  "/:id/status",
  protect,
  authorize("admin"),
  updateTicketStatusValidator,
  validate,
  updateTicketStatus
);

// ADMIN OR OWNER MESSAGE
router.post(
  "/:id/messages",
  protect,
  addMessageValidator,
  validate,
  addMessage
);

export default router;