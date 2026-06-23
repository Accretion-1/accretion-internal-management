import express from "express";
import {
  createUserController,
  getUserProfileController,
  loginUserController,
  resendUserOTPController,
  updateUserController,
  verifyUserOTPController,
} from "../controllers/user.controller.js";
import { authGuard } from "../middlewares/guard.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createUserSchema,
  loginUserSchema,
  resendOTPSchema,
  updateUserSchema,
  userIdParamSchema,
  verifyOTPSchema,
} from "../validations/user.validation.js";

const router = express.Router();

router.post("/login", validate(loginUserSchema, "body"), loginUserController);
router.post("/verify-otp", validate(verifyOTPSchema, "body"), verifyUserOTPController);
router.post("/resend-otp", validate(resendOTPSchema, "body"), resendUserOTPController);
router.get("/profile", authGuard, getUserProfileController);
router.post("/add", authGuard, validate(createUserSchema, "body"), createUserController);
router.put(
  "/update/:user_id",
  authGuard,
  validate(userIdParamSchema, "params"),
  validate(updateUserSchema, "body"),
  updateUserController,
);

export default router;
