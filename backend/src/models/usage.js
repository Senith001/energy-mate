import mongoose from "mongoose";

const usageSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true
    },

    date: {
      type: Date,
      required: true
    },

    entryType: {
      type: String,
      enum: ["manual", "meter"],
      default: "manual"
    },

    unitsUsed: {
      type: Number,
      required: true,
      min: 0
    },

    previousReading: {
      type: Number,
      default: null
    },

    currentReading: {
      type: Number,
      default: null
    }

  },
  { timestamps: true }
);

// Prevent duplicate entry for same day
usageSchema.index(
  { householdId: 1, date: 1 },
  { unique: true }
);

export default mongoose.model("Usage", usageSchema);
