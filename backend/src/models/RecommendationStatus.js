import mongoose from "mongoose";

const recommendationStatusSchema = new mongoose.Schema(
  {
    householdId: { type: mongoose.Schema.Types.ObjectId, ref: "Household", required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "RecommendationTemplate", required: true },

    status: { type: String, enum: ["active", "applied", "dismissed"], default: "active" },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

recommendationStatusSchema.index({ householdId: 1, templateId: 1 }, { unique: true });

export default mongoose.model("RecommendationStatus", recommendationStatusSchema);