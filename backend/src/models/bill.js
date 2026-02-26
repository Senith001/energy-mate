import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },

    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },

    previousReading: {
      type: Number,
      default: null,
    },

    currentReading: {
      type: Number,
      default: null,
    },

    totalUnits: {
      type: Number,
      required: true,
      min: 0,
    },

    energyCharge: {
      type: Number,
      required: true,
      min: 0,
    },

    fixedCharge: {
      type: Number,
      required: true,
      min: 0,
    },

    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    sscl: {
      type: Number,
      required: true,
      min: 0,
    },

    totalCost: {
      type: Number,
      required: true,
      min: 0,
    },

    breakdown: [
      {
        range: String,
        units: Number,
        rate: Number,
        cost: Number,
        _id: false,
      },
    ],

    status: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },

    dueDate: {
      type: Date,
      required: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One bill per household per month
billSchema.index({ householdId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.model("Bill", billSchema);
