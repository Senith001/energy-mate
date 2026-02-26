import { body } from "express-validator";

export const createRoomValidator = [
  body("name").notEmpty().withMessage("name is required")
];

export const updateRoomValidator = [
  body("name").optional().notEmpty().withMessage("name cannot be empty")
];