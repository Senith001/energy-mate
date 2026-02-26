import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { sendEmail } from "../utils/email.js";

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
    });

    // 🔹 Generate OTP (6 digits)
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Optional cleanup: remove old unused VERIFY_EMAIL OTPs for this user
    await Otp.deleteMany({
      userId: user._id,
      purpose: "VERIFY_EMAIL",
      usedAt: null,
    });

    await Otp.create({
      userId: user._id,
      purpose: "VERIFY_EMAIL",
      otpHash,
      expiresAt,
    });

    console.log("OTP:", otp);
    console.log("📧 Sending OTP email to:", user.email);

    await sendEmail({
      to: user.email,
      subject: "ENERGYMATE OTP Verification",
      html: `
        <p>Hello ${user.name},</p>
        <p>Your OTP is: <b>${otp}</b></p>
        <p>This code expires in 10 minutes.</p>
      `,
    });

    console.log("✅ OTP email sent (check Mailtrap inbox)");

    return res.status(201).json({
      message: "User registered successfully. OTP sent to email.",
      userId: user.userId,
    });
  } catch (err) {
    return handleError(err, res, next);
  }
};

// ================= ADMIN REGISTER =================
export const registerAdmin = async (req, res, next) => {
  try {
    const incoming = req.headers["x-admin-secret"];

    if (!incoming || incoming !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ message: "Unauthorized admin registration" });
    }


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

    const admin = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
      isVerified: true
    });

    return res.status(201).json({
      message: "Admin registered successfully",
      userId: admin.userId,
    });

  } catch (err) {
    return handleError(err, res, next);
  }
};


// ================= CREATE ADMIN (Admin-only) =================
export const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "admin",
      isVerified: true, // admins are trusted accounts created by admins
    });

    return res.status(201).json({
      message: "Admin created successfully",
      user: {
        id: admin._id,
        userId: admin.userId,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    return handleError(err, res, next);
  }
};

// ================= VERIFY OTP =================
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return res.status(400).json({
        message: "email and otp are required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otpDoc = await Otp.findOne({
      userId: user._id,
      purpose: "VERIFY_EMAIL",
      usedAt: null,
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (otpDoc.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const isMatch = await bcrypt.compare(String(otp), otpDoc.otpHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    otpDoc.usedAt = new Date();
    await otpDoc.save();

    user.isVerified = true;
    await user.save();

    const token = signToken(user);

    return res.status(200).json({
      message: "Email verified successfully",
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

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
      });
    }

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

// ================= ADMIN - VIEW ALL USERS =================
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");

    return res.status(200).json({
      count: users.length,
      users,
    });
  } catch (err) {
    return handleError(err, res, next);
  }
};

// ================= ADMIN - DELETE USER =================
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent admin from deleting another admin (optional safety)
    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete another admin" });
    }

    await user.deleteOne();

    return res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    return handleError(err, res, next);
  }
};


// ================= ADMIN - CHANGE USER PASSWORD =================
export const changeUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "New password required" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword; // ✅ update existing password field

    await user.save();

    return res.status(200).json({
      message: "Password updated successfully",
    });

  } catch (err) {
    return handleError(err, res, next);
  }
};