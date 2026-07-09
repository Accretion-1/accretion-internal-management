import express from "express";
import {
  createUserController,
  deleteUserController,
  getUserByIdController,
  getUserProfileController,
  getUsersController,
  loginUserController,
  resendUserOTPController,
  updateUserController,
  updateUserFcmTokenController,
  verifyUserOTPController,
} from "../controllers/user.controller.js";
import { authGuard } from "../middlewares/guard.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  createUserSchema,
  loginUserSchema,
  resendOTPSchema,
  updateUserSchema,
  updateFcmTokenSchema,
  userIdParamSchema,
  verifyOTPSchema,
} from "../validations/user.validation.js";

const router = express.Router();

router.post("/login", validate(loginUserSchema, "body"), loginUserController);
router.post("/verify-otp", validate(verifyOTPSchema, "body"), verifyUserOTPController);
router.post("/resend-otp", validate(resendOTPSchema, "body"), resendUserOTPController);
router.put("/fcm-token", authGuard, validate(updateFcmTokenSchema, "body"), updateUserFcmTokenController);
router.get("/profile", authGuard, getUserProfileController);
router.get("/", authGuard, getUsersController);
router.get("/:user_id", authGuard, validate(userIdParamSchema, "params"), getUserByIdController);
router.post("/add", authGuard, validate(createUserSchema, "body"), createUserController);
router.put(
  "/update/:user_id",
  authGuard,
  validate(userIdParamSchema, "params"),
  validate(updateUserSchema, "body"),
  updateUserController,
);
router.delete(
  "/delete/:user_id",
  authGuard,
  validate(userIdParamSchema, "params"),
  deleteUserController,
);

export default router;
