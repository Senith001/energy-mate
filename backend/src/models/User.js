import mongoose from "mongoose";
import Counter from "./Counter.js";

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true, index: true }, // U001, U002...
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: "user", enum: ["user", "admin", "superadmin"] },
    isVerified: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Promise-style middleware (no next param)
userSchema.pre("save", async function () {
  if (!this.isNew) return;
  if (this.userId) return;

  let roleKey;
  let prefix;

  if (this.role === "superadmin") {
    roleKey = "superadmin";
    prefix = "S";
  } else if (this.role === "admin") {
    roleKey = "admin";
    prefix = "A";
  } else {
    roleKey = "user";
    prefix = "U";
  }

  const counter = await Counter.findOneAndUpdate(
    { name: roleKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.userId = `${prefix}${String(counter.seq).padStart(3, "0")}`;
});

export default mongoose.model("User", userSchema);
