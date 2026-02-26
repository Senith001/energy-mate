import mongoose from "mongoose";

const recommendationTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    category: {
      type: String,
      enum: ["lighting", "appliances", "cooling", "cooking", "general"],
      default: "general",
    },

    priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    tags: { type: [String], default: [] },
    learnMoreUrl: { type: String, default: "" },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("RecommendationTemplate", recommendationTemplateSchema);