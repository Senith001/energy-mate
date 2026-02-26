import mongoose from "mongoose";

const householdSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    occupants: { type: Number, required: true, min: 1 },

    monthlyKwhTarget: { type: Number, default: 0, min: 0 },
    monthlyCostTarget: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "LKR" },
  },
  { timestamps: true }
);

export default mongoose.model("Household", householdSchema);