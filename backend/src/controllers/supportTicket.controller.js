import SupportTicket from "../models/SupportTicket.js";
import { getReqUserId, isAdmin } from "../utils/authHelpers.js";

// CREATE (user)
export const createTicket = async (req, res, next) => {
  try {
    const userId = getReqUserId(req);

    const saved = await SupportTicket.create({
      ...req.body,
      userId,
    });

    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

// READ (user) - only their tickets
export const getMyTickets = async (req, res, next) => {
  try {
    const userId = getReqUserId(req);

    const list = await SupportTicket.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(list);
  } catch (err) {
    next(err);
  }
};

// READ (admin) - all tickets
export const getAllTickets = async (req, res, next) => {
  try {
    const list = await SupportTicket.find().sort({ createdAt: -1 });
    res.status(200).json(list);
  } catch (err) {
    next(err);
  }
};

// READ ONE (admin OR owner)
export const getTicketById = async (req, res, next) => {
  try {
    const userId = getReqUserId(req);

    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, userId };

    const ticket = await SupportTicket.findOne(filter);

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    res.status(200).json(ticket);
  } catch (err) {
    next(err);
  }
};

// UPDATE status (admin only)
export const updateTicketStatus = async (req, res, next) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const updated = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Ticket not found" });

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

// ADD MESSAGE (admin OR owner)
export const addMessage = async (req, res, next) => {
  try {
    const userId = getReqUserId(req);

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (!isAdmin(req) && String(ticket.userId) !== String(userId)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const sender = isAdmin(req) ? "admin" : "user";
    const { text } = req.body;

    ticket.messages.push({ sender, text });
    await ticket.save();

    res.status(200).json(ticket);
  } catch (err) {
    next(err);
  }
};

// DELETE (admin OR owner)
export const deleteTicket = async (req, res, next) => {
  try {
    const userId = getReqUserId(req);

    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, userId };

    const deleted = await SupportTicket.findOneAndDelete(filter);

    if (!deleted) return res.status(404).json({ message: "Ticket not found" });

    res.status(200).json({ message: "Ticket deleted successfully" });
  } catch (err) {
    next(err);
  }
};