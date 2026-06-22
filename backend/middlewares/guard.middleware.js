import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../constants.js";
import * as userModel from "../model/user.model.js";
import { apiError, apiHandler } from "../utils/api.util.js";
import { NOT_FOUND, UNAUTHORIZED } from "../utils/message.util.js";
import { isEmpty } from "../utils/misc.util.js";

export const authGuard = apiHandler(async (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return apiError(UNAUTHORIZED, "User", null, res);
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return apiError(UNAUTHORIZED, "User", null, res);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return apiError(UNAUTHORIZED, "Invalid token", null, res);
  }

  const { user_id, role } = decoded;
  if (!user_id) {
    return apiError(UNAUTHORIZED, "User", null, res);
  }

  const user = await userModel.getUserByIdModel(user_id);
  if (isEmpty(user)) {
    return apiError(NOT_FOUND, "User", null, res);
  }

  if (!user.is_active || !user.is_verified || user.role !== role) {
    return apiError(UNAUTHORIZED, "User", null, res);
  }

  req.user = {
    ...user,
    is_admin: user.role === "ADMIN",
  };

  return next();
});
