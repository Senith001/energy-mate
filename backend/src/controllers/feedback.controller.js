import Feedback from "../models/Feedback.js";
import { getReqUserId, isAdmin } from "../utils/authHelpers.js";

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

export const getMyFeedback = async (req, res, next) => {
  try {
    const userId = getReqUserId(req);
    const list = await Feedback.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(list);
  } catch (err) {
    next(err);
  }
};

export const getAllFeedback = async (req, res, next) => {
  try {
    const list = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json(list);
  } catch (err) {
    next(err);
  }
};

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