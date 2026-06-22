import express from "express";
import {
  getUserProfileController,
  loginUserController,
  resendUserOTPController,
  verifyUserOTPController,
} from "../controllers/user.controller.js";
import { authGuard } from "../middlewares/guard.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  loginUserSchema,
  resendOTPSchema,
  verifyOTPSchema,
} from "../validations/user.validation.js";

const router = express.Router();

router.post("/login", validate(loginUserSchema, "body"), loginUserController);
router.post("/verify-otp", validate(verifyOTPSchema, "body"), verifyUserOTPController);
router.post("/resend-otp", validate(resendOTPSchema, "body"), resendUserOTPController);
router.get("/profile", authGuard, getUserProfileController);

export default router;
