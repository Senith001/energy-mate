import express from "express";
import {registerUser, loginUser, verifyOtp, forgotPassword, resetPassword, changeMyPassword} from "../controllers/userController.js";
import { registerAdmin } from "../controllers/userController.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { createAdmin } from "../controllers/userController.js";

import { getAllUsers, deleteUser, changeUserPassword, deleteAdmin, changeAdminPassword, getAllAdmins  } from "../controllers/userController.js";



const router = express.Router();

router.post("/register", registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/login", loginUser);
router.post("/admin/register", registerAdmin);

router.post("/admin/create", protect, authorize("admin"), createAdmin);

router.get("/admin/users", protect, authorize("admin"), getAllUsers);


router.delete("/admin/users/:id", protect, authorize("admin"), deleteUser);

router.put("/admin/users/:id/password", protect, authorize("admin"), changeUserPassword);

router.delete("/superadmin/admins/:id", protect, authorize("superadmin"), deleteAdmin);
router.put("/superadmin/admins/:id/password", protect, authorize("superadmin"), changeAdminPassword);

router.get("/superadmin/admins", protect, authorize("superadmin"), getAllAdmins);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/me/change-password", protect, changeMyPassword);

export default router;