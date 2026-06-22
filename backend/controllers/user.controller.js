import { apiHandler, apiResponse } from "../utils/api.util.js";
import { CUSTOM_SUCCESS } from "../utils/message.util.js";
import * as userService from "../services/user.service.js";

export const loginUserController = apiHandler(async (req, res) => {
  await userService.loginUserService(req.body);
  return apiResponse(CUSTOM_SUCCESS, "OTP sent successfully", null, res);
});

export const verifyUserOTPController = apiHandler(async (req, res) => {
  const result = await userService.verifyUserOTPService(req.body);
  return apiResponse(CUSTOM_SUCCESS, "Login successful", result, res, "object");
});

export const resendUserOTPController = apiHandler(async (req, res) => {
  await userService.resendUserOTPService(req.body.phone_number);
  return apiResponse(CUSTOM_SUCCESS, "OTP resent successfully", null, res);
});
