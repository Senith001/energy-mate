import { body } from "express-validator";
import { passwordRule } from "./common.rules.js";

export const registerValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ max: 10 })
    .withMessage("Username must not exceed 10 characters")
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage("Username can only contain letters and numbers"),

  body("email").trim().isEmail().withMessage("Valid email is required"),
  passwordRule("password"),
];

export const resetPasswordValidator = [
  body("email").trim().isEmail().withMessage("Valid email is required"),
  body("otp").trim().notEmpty().withMessage("OTP is required"),
  passwordRule("newPassword"),
];

export const changeMyPasswordValidator = [
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  passwordRule("newPassword"),
];

export const adminChangeUserPasswordValidator = [
  passwordRule("password"),
];

export const updateProfileValidator = [
  body("name")
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage("Username must not exceed 10 characters")
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage("Username can only contain letters and numbers"),
];