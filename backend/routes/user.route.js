import express from "express";
import {
  loginUserController,
  resendUserOTPController,
  verifyUserOTPController,
} from "../controllers/user.controller.js";
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

export default router;
