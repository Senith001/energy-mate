import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    type: { type: String, enum: ["bug", "suggestion", "complaint", "other"], default: "other" },
    message: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, default: 5 },

    status: { type: String, enum: ["new", "in_progress", "resolved"], default: "new" },
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);