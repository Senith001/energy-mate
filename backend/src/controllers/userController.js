import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const signToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// Helper: safe error forwarding
const handleError = (err, res, next) => {
  console.error("❌ Controller Error:", err);
  if (typeof next === "function") return next(err);
  return res.status(500).json({
    message: err.message || "Server error",
  });
};

// ================= REGISTER =================
export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "name, email, password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
      isVerified: true
    });

    const token = signToken(user);

    return res.status(201).json({
      message: "User registered successfully.",
      token,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return handleError(err, res, next);
  }
};

// ================= LOGIN =================
export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        message: "email and password are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user);

    return res.status(200).json({
      message: "Login success",
      token,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return handleError(err, res, next);
  }
};

// Step 02: OTP not configured yet
export const verifyOtp = async (req, res) => {
  return res.status(501).json({ message: "OTP not configured yet" });
};