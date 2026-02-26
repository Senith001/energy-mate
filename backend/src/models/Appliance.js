import mongoose from "mongoose";

const applianceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    householdId: { type: mongoose.Schema.Types.ObjectId, ref: "Household", required: true },

    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null },

    name: { type: String, required: true, trim: true },
    wattage: { type: Number, required: true, min: 1 },
    quantity: { type: Number, default: 1, min: 1 },
    defaultHoursPerDay: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Appliance", applianceSchema);