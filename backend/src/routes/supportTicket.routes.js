import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import {
  createTicket,
  getMyTickets,
  getAllTickets,
  updateTicketStatus,
  addMessage,
} from "../controllers/supportTicket.controller.js";

const router = express.Router();

router.post("/", protect, createTicket);
router.get("/my", protect, getMyTickets);

router.get("/", protect, authorize("admin"), getAllTickets);
router.patch("/:id/status", protect, authorize("admin"), updateTicketStatus);

router.post("/:id/messages", protect, addMessage);

export default router;