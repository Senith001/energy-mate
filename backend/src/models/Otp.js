import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    purpose: {
      type: String,
      required: true,
      enum: ["VERIFY_EMAIL", "RESET_PASSWORD", "TWO_FA_LOGIN"],
      index: true,
    },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// TTL Index: auto-delete when expiresAt passes
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Otp", otpSchema);