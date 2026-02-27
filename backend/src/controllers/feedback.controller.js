import Feedback from "../models/Feedback.js";
import { getReqUserId, isAdmin } from "../utils/authHelpers.js";

// CREATE (user)
export const createFeedback = async (req, res, next) => {
  try {
    const userId = getReqUserId(req);

    const saved = await Feedback.create({
      ...req.body,
      userId,
    });

    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
};

// READ (user) - only their feedback
export const getMyFeedback = async (req, res, next) => {
  try {
    const userId = getReqUserId(req);

    const list = await Feedback.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(list);
  } catch (err) {
    next(err);
  }
};

// READ (admin) - all feedback
export const getAllFeedback = async (req, res, next) => {
  try {
    const list = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json(list);
  } catch (err) {
    next(err);
  }
};

// READ ONE (admin OR owner)
export const getFeedbackById = async (req, res, next) => {
  try {
    const userId = getReqUserId(req);

    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, userId };

    const feedback = await Feedback.findOne(filter);

    if (!feedback) return res.status(404).json({ message: "Feedback not found" });

    res.status(200).json(feedback);
  } catch (err) {
    next(err);
  }
};

// UPDATE status (admin only)
export const updateFeedbackStatus = async (req, res, next) => {
  try {
    if (!isAdmin(req)) return res.status(403).json({ message: "Admin only" });

    const updated = await Feedback.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Feedback not found" });

    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
};

// DELETE (admin OR owner)
export const deleteFeedback = async (req, res, next) => {
  try {
    const userId = getReqUserId(req);

    const filter = isAdmin(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, userId };

    const deleted = await Feedback.findOneAndDelete(filter);

    if (!deleted) return res.status(404).json({ message: "Feedback not found" });

    res.status(200).json({ message: "Feedback deleted successfully" });
  } catch (err) {
    next(err);
  }
};