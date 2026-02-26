import mongoose from "mongoose";

const slabSchema = new mongoose.Schema(
  {
    upTo:        { type: Number, default: null }, // null = Infinity
    rate:        { type: Number, required: true },
    fixedCharge: { type: Number, required: true },
  },
  { _id: false }
);

const tariffSchema = new mongoose.Schema(
  {
    name:       { type: String, default: "domestic", unique: true },
    tariffLow:  { type: [slabSchema], required: true },
    tariffHigh: { type: [slabSchema], required: true },
    ssclRate:   { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Tariff", tariffSchema);