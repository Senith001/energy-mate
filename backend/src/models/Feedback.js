import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    type: { type: String, enum: ["bug", "suggestion", "complaint", "other"], default: "other" },
    message: { type: String, required: true, trim: true },
    rating: { type: Number, min: 1, max: 5, default: null },
    status: { type: String, enum: ["new", "in_progress", "resolved"], default: "new" }
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);