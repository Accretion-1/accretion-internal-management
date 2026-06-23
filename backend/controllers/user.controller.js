import { apiHandler, apiResponse } from "../utils/api.util.js";
import { ADD_SUCCESS, CUSTOM_SUCCESS, FETCH, UPDATE_SUCCESS } from "../utils/message.util.js";
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

export const getUserProfileController = apiHandler(async (req, res) => {
  const user = await userService.getUserProfileService(req.user);
  return apiResponse(CUSTOM_SUCCESS, "User profile fetched successfully", user, res, "object");
});

export const getUsersController = apiHandler(async (req, res) => {
  const users = await userService.getUsersService(Number(req.user.user_id));
  return apiResponse(FETCH, "Users", users, res);
});

export const getUserByIdController = apiHandler(async (req, res) => {
  const user = await userService.getUserByIdService(req.params.user_id);
  return apiResponse(FETCH, "User", user, res, "object");
});

export const createUserController = apiHandler(async (req, res) => {
  const user = await userService.createUserService(req.body, req.user);
  return apiResponse(ADD_SUCCESS, "User", user, res, "object");
});

export const updateUserController = apiHandler(async (req, res) => {
  const user = await userService.updateUserService(req.params.user_id, req.body, req.user);
  return apiResponse(UPDATE_SUCCESS, "User", user, res, "object");
});
