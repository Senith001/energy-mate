import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    householdId: { type: mongoose.Schema.Types.ObjectId, ref: "Household", required: true },

    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);