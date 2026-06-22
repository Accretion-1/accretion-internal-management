import jwt from "jsonwebtoken";
import { JWT_SECRET, NODE_ENV, TEST_OTP } from "../constants.js";
import * as userModel from "../model/user.model.js";
import { ApiError } from "../utils/api.util.js";
import { CUSTOM_ERROR, INVALID, NOT_FOUND } from "../utils/message.util.js";
import { generateJWTToken, generateOTPCode, isEmpty } from "../utils/misc.util.js";
import { sendOTP } from "../utils/twillio.util.js";

const OTP_EXPIRY = "5m";
const isDevelopment = NODE_ENV === "development";

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
  gender: user.gender,
  profile_image: user.profile_image,
  is_verified: Boolean(user.is_verified),
  is_active: Boolean(user.is_active),
  created_at: user.created_at,
  role: user.role,
});

export const loginUserService = async ({ phone_number, fcm_token = null }) => {
  try {
    const user = await getActiveUser(phone_number);

    if (fcm_token) {
      await userModel.updateUserFcmTokenModel(user.user_id, fcm_token);
    }

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

export const verifyUserOTPService = async ({ phone_number, otp }) => {
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

    const authenticatedUser = {
      ...user,
      is_verified: 1,
    };
    const token = generateJWTToken({
      user_id: user.user_id,
      role: user.role,
      is_admin: user.role === "ADMIN",
    });

    return { user: sanitizeUser(authenticatedUser), token };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(CUSTOM_ERROR, "Unable to verify OTP", error, false);
  }
};

export const getUserProfileService = (user) => sanitizeUser(user);
