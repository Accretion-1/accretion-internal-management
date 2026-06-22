import db from "../config/db.js";
import { ApiError } from "../utils/api.util.js";
import { DB_ERROR } from "../utils/message.util.js";

export const getUserByPhoneNumberModel = async (phoneNumber) => {
  try {
    return await db.query("SELECT * FROM users WHERE phone_number = ? LIMIT 1", [phoneNumber]);
  } catch (error) {
    throw new ApiError(DB_ERROR, "Checking User", error, false);
  }
};

export const getUserByIdModel = async (userId) => {
  try {
    const [user] = await db.query("SELECT * FROM users WHERE user_id = ? LIMIT 1", [userId]);
    return user;
  } catch (error) {
    throw new ApiError(DB_ERROR, "Checking User", error, false);
  }
};

export const updateUserOTPModel = async (userId, otp, verificationToken) => {
  try {
    return await db.query(
      "UPDATE users SET otp = ?, verification_token = ? WHERE user_id = ?",
      [otp, verificationToken, userId],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Updating User OTP", error, false);
  }
};

export const updateUserFcmTokenModel = async (userId, fcmToken) => {
  try {
    return await db.query("UPDATE users SET fcm_token = ? WHERE user_id = ?", [fcmToken, userId]);
  } catch (error) {
    throw new ApiError(DB_ERROR, "Updating FCM Token", error, false);
  }
};

export const markUserVerifiedModel = async (userId) => {
  try {
    return await db.query(
      "UPDATE users SET is_verified = 1, otp = NULL, verification_token = NULL WHERE user_id = ?",
      [userId],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Verifying User", error, false);
  }
};

export const clearUserOTPModel = async (userId) => {
  try {
    return await db.query(
      "UPDATE users SET otp = NULL, verification_token = NULL WHERE user_id = ?",
      [userId],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Clearing User OTP", error, false);
  }
};
