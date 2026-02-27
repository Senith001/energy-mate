import express from "express";
import {registerUser, loginUser, verifyOtp, forgotPassword, resetPassword, changeMyPassword} from "../controllers/userController.js";
import { registerAdmin } from "../controllers/userController.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { createAdmin } from "../controllers/userController.js";

import { getAllUsers, deleteUser, changeUserPassword, deleteAdmin, changeAdminPassword, getAllAdmins  } from "../controllers/userController.js";

import { getMyProfile, updateMyProfile, uploadMyAvatar, deleteMyAvatar } from "../controllers/userController.js";
import { uploadAvatar } from "../middlewares/upload.middleware.js";

import { validate } from "../middlewares/validate.middleware.js";
import {registerValidator, resetPasswordValidator, changeMyPasswordValidator, adminChangeUserPasswordValidator, updateProfileValidator} from "../validators/user.validators.js";

const router = express.Router();

router.post("/register", registerValidator, validate, registerUser);
router.post("/verify-otp", verifyOtp);
router.post("/login", loginUser);
router.post("/admin/register", registerAdmin);

router.post("/admin/create", protect, authorize("admin"), createAdmin);

router.get("/admin/users", protect, authorize("admin", "superadmin"), getAllUsers);


router.delete("/admin/users/:id", protect, authorize("admin"), deleteUser);

router.put( "/admin/users/:id/password", protect, authorize("admin"), adminChangeUserPasswordValidator, validate, changeUserPassword);

router.delete("/superadmin/admins/:id", protect, authorize("superadmin"), deleteAdmin);
router.put("/superadmin/admins/:id/password", protect, authorize("superadmin"), changeAdminPassword);

router.get("/superadmin/admins", protect, authorize("superadmin"), getAllAdmins);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordValidator, validate, resetPassword);
router.put("/me/change-password", protect, changeMyPasswordValidator, validate, changeMyPassword);

router.get("/me", protect, getMyProfile);
router.put("/me", protect, updateProfileValidator, validate, updateMyProfile);

// avatar upload uses multipart/form-data with field name: "avatar"
router.put("/me/avatar", protect, uploadAvatar.single("avatar"), uploadMyAvatar);
router.delete("/me/avatar", protect, deleteMyAvatar);

export default router;