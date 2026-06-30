import jwt from "jsonwebtoken";
import { JWT_SECRET, NODE_ENV, TEST_OTP } from "../constants.js";
import * as locationModel from "../model/location.model.js";
import * as notificationService from "./notification.service.js";
import * as panelModel from "../model/panel.model.js";
import * as userModel from "../model/user.model.js";
import { ApiError } from "../utils/api.util.js";
import { ADD_ERROR, CUSTOM_ERROR, EXISTS, FORBIDDEN, INVALID, NOT_FOUND, UPDATE_ERROR } from "../utils/message.util.js";
import { generateJWTToken, generateOTPCode, isEmpty } from "../utils/misc.util.js";
import { sendOTP } from "../utils/twillio.util.js";

const OTP_EXPIRY = "5m";
const isDevelopment = NODE_ENV === "development";
const ROLE_RANK = {
  USER: 1,
  MANAGER: 2,
  ADMIN: 3,
};

const canManageRole = (actorRole, targetRole) => (
  (ROLE_RANK[String(actorRole || "").toUpperCase()] || 0) >
  (ROLE_RANK[String(targetRole || "").toUpperCase()] || 0)
);

const sendLoginSuccessNotification = async (userId, fcmToken) => {
  if (!fcmToken) return;

  try {
    await notificationService.sendNotification(
      fcmToken,
      "Login successful",
      "You have successfully logged in.",
      {
        data: {
          type: "LOGIN_SUCCESS",
        },
      },
    );
  } catch (error) {
    if (notificationService.isUnregisteredTokenError(error)) {
      await userModel.clearUserFcmTokenModel(userId);
    }

    console.warn("Unable to send login success notification:", error?.message || error);
  }
};

const getActiveUser = async (phoneNumber) => {
  const [user] = await userModel.getUserByPhoneNumberModel(phoneNumber);

  if (isEmpty(user)) {
    throw new ApiError(NOT_FOUND, "User");
  }

  if (!user.is_active) {
    throw new ApiError(CUSTOM_ERROR, "Your account is inactive");
  }

  return user;
};

const issueOTP = async (user) => {
  const otp = isDevelopment ? TEST_OTP : generateOTPCode();

  if (isDevelopment && !otp) {
    throw new ApiError(CUSTOM_ERROR, "TEST_OTP is required in development mode");
  }

  const verificationToken = jwt.sign(
    {
      purpose: "phone_login",
      user_id: user.user_id,
      phone_number: user.phone_number,
    },
    JWT_SECRET,
    { expiresIn: OTP_EXPIRY },
  );

  await userModel.updateUserOTPModel(user.user_id, otp, verificationToken);

  if (isDevelopment) return;

  try {
    await sendOTP(user.phone_number, otp);
  } catch (error) {
    await userModel.clearUserOTPModel(user.user_id);
    throw error;
  }
};

const sanitizeUser = (user) => ({
  user_id: user.user_id,
  phone_number: user.phone_number,
  email: user.email,
  full_name: user.full_name,
  location_id: user.location_id,
  location: user.location_id
    ? {
        location_id: user.location_id,
        district: user.district,
        godown: user.godown,
        sloc: user.sloc,
        cap: user.cap,
        remark: user.remark,
      }
    : null,
  gender: user.gender,
  profile_image: user.profile_image,
  is_verified: Boolean(user.is_verified),
  is_active: Boolean(user.is_active),
  created_at: user.created_at,
  updated_at: user.updated_at,
  role: user.role,
});

const normalizeCreateUserPayload = (payload) => ({
  ...payload,
  phone_number: String(payload.phone_number || "").replace(/\s/g, ""),
  email: payload.email || null,
  full_name: payload.full_name || null,
  location_id: payload.role === "USER" ? payload.location_id : null,
  gender: payload.gender || null,
  profile_image: payload.profile_image || null,
  is_active: payload.is_active === false ? 0 : 1,
  panel_ids: [...new Set(payload.panel_ids || [])],
});

const normalizeUpdateUserPayload = (payload, existingUser) => {
  const normalizedPayload = {};

  if (Object.prototype.hasOwnProperty.call(payload, "phone_number")) {
    normalizedPayload.phone_number = String(payload.phone_number || "").replace(/\s/g, "");
  }

  if (Object.prototype.hasOwnProperty.call(payload, "full_name")) {
    normalizedPayload.full_name = payload.full_name || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "is_active")) {
    normalizedPayload.is_active = payload.is_active === false ? 0 : 1;
  }

  if (existingUser.role === "USER" && Object.prototype.hasOwnProperty.call(payload, "panel_ids")) {
    normalizedPayload.panel_ids = [...new Set(payload.panel_ids || [])];
  }

  return normalizedPayload;
};

export const loginUserService = async ({ phone_number }) => {
  try {
    const user = await getActiveUser(phone_number);

    await issueOTP(user);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(CUSTOM_ERROR, "Unable to send OTP", error, false);
  }
};

export const resendUserOTPService = async (phoneNumber) => {
  try {
    const user = await getActiveUser(phoneNumber);
    await issueOTP(user);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(CUSTOM_ERROR, "Unable to resend OTP", error, false);
  }
};

export const verifyUserOTPService = async ({ phone_number, otp, fcm_token = null }) => {
  try {
    const user = await getActiveUser(phone_number);
    const expectedOTP = isDevelopment ? TEST_OTP : user.otp;

    if (!expectedOTP || String(expectedOTP) !== String(otp)) {
      throw new ApiError(INVALID, "OTP");
    }

    try {
      const payload = jwt.verify(user.verification_token, JWT_SECRET);
      if (
        payload.purpose !== "phone_login" ||
        Number(payload.user_id) !== Number(user.user_id) ||
        payload.phone_number !== user.phone_number
      ) {
        throw new Error("Invalid OTP token");
      }
    } catch {
      throw new ApiError(CUSTOM_ERROR, "OTP has expired. Please resend OTP");
    }

    await userModel.markUserVerifiedModel(user.user_id);

    if (fcm_token) {
      await userModel.updateUserFcmTokenModel(user.user_id, fcm_token);
      await sendLoginSuccessNotification(user.user_id, fcm_token);
    }

    const authenticatedUser = await userModel.getUserDetailByIdModel(user.user_id);
    const panels = authenticatedUser.role === "USER"
      ? await userModel.getUserPanelsModel(user.user_id)
      : [];
    const token = generateJWTToken({
      user_id: user.user_id,
      role: user.role,
      is_admin: user.role === "ADMIN",
    });

    return {
      user: {
        ...sanitizeUser({ ...authenticatedUser, is_verified: 1 }),
        panels,
      },
      token,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(CUSTOM_ERROR, "Unable to verify OTP", error, false);
  }
};

export const getUserProfileService = async (user) => {
  const userDetails = await userModel.getUserDetailByIdModel(user.user_id);
  const panels = userDetails.role === "USER"
    ? await userModel.getUserPanelsModel(user.user_id)
    : [];

  return {
    ...sanitizeUser(userDetails),
    panels,
  };
};

export const getUsersService = async (user_id) => {
  try {
    const users = await userModel.getUsersModel(user_id);

    return await Promise.all(
      users.map(async (user) => ({
        ...sanitizeUser(user),
        panels: user.role === "USER" ? await userModel.getUserPanelsModel(user.user_id) : [],
      })),
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(CUSTOM_ERROR, "Unable to fetch users", error, false);
  }
};

export const getUserByIdService = async (userId) => {
  try {
    const user = await userModel.getUserDetailByIdModel(userId);
    if (isEmpty(user)) {
      throw new ApiError(NOT_FOUND, "User");
    }

    const panels = user.role === "USER" ? await userModel.getUserPanelsModel(userId) : [];

    return {
      ...sanitizeUser(user),
      panels,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(CUSTOM_ERROR, "Unable to fetch user", error, false);
  }
};

export const createUserService = async (payload, actorUser) => {
  try {
    const userPayload = normalizeCreateUserPayload(payload);
    if (!canManageRole(actorUser?.role, userPayload.role)) {
      throw new ApiError(FORBIDDEN, "User");
    }

    const existingUsers = await userModel.getUserByPhoneNumberModel(userPayload.phone_number);

    if (!isEmpty(existingUsers)) {
      throw new ApiError(EXISTS, "Phone number");
    }

    if (userPayload.role === "USER") {
      const location = await locationModel.getLocationByIdModel(userPayload.location_id);
      if (isEmpty(location)) {
        throw new ApiError(NOT_FOUND, "Location");
      }

      const panels = await panelModel.getPanelsByIdsModel(userPayload.panel_ids);
      if (panels.length !== userPayload.panel_ids.length) {
        throw new ApiError(INVALID, "panel_ids");
      }
    } else {
      userPayload.panel_ids = [];
    }

    const userId = await userModel.createUserModel(userPayload);
    const createdUser = await userModel.getUserDetailByIdModel(userId);
    const panels = userPayload.role === "USER" ? await userModel.getUserPanelsModel(userId) : [];

    return {
      ...sanitizeUser(createdUser),
      panels,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(ADD_ERROR, "User", error, false);
  }
};

export const updateUserService = async (userId, payload, actorUser) => {
  try {
    const existingUser = await userModel.getUserByIdModel(userId);
    if (isEmpty(existingUser)) {
      throw new ApiError(NOT_FOUND, "User");
    }

    if (!canManageRole(actorUser?.role, existingUser.role)) {
      throw new ApiError(FORBIDDEN, "User");
    }

    const userPayload = normalizeUpdateUserPayload(payload, existingUser);

    if (userPayload.phone_number && userPayload.phone_number !== existingUser.phone_number) {
      const usersWithPhoneNumber = await userModel.getUserByPhoneNumberModel(userPayload.phone_number);
      const phoneNumberExists = usersWithPhoneNumber.some(
        (user) => Number(user.user_id) !== Number(userId),
      );

      if (phoneNumberExists) {
        throw new ApiError(EXISTS, "Phone number");
      }
    }

    if (Object.prototype.hasOwnProperty.call(userPayload, "panel_ids")) {
      const panels = await panelModel.getPanelsByIdsModel(userPayload.panel_ids);
      if (panels.length !== userPayload.panel_ids.length) {
        throw new ApiError(INVALID, "panel_ids");
      }
    }

    await userModel.updateUserDetailsModel(userId, userPayload);

    const updatedUser = await userModel.getUserDetailByIdModel(userId);
    const panels = updatedUser.role === "USER" ? await userModel.getUserPanelsModel(userId) : [];

    return {
      ...sanitizeUser(updatedUser),
      panels,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(UPDATE_ERROR, "User", error, false);
  }
};

export const updateUserFcmTokenService = async (userId, fcmToken) => {
  try {
    await userModel.updateUserFcmTokenModel(userId, fcmToken || null);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(UPDATE_ERROR, "FCM token", error, false);
  }
};
