import mongoose from "mongoose";
import Counter from "./Counter.js";

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true, index: true }, // U001, U002...
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: "user", enum: ["user", "admin"] },
    isVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Promise-style middleware (no next param)
userSchema.pre("save", async function () {
  if (!this.isNew) return;
  if (this.userId) return;

  const roleKey = this.role === "admin" ? "admin" : "user";

  const counter = await Counter.findOneAndUpdate(
    { name: roleKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const prefix = roleKey === "admin" ? "A" : "U";

  this.userId = `${prefix}${String(counter.seq).padStart(3, "0")}`;
});

export default mongoose.model("User", userSchema);
