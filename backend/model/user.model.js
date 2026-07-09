import db from "../config/db.js";
import { ApiError } from "../utils/api.util.js";
import { DB_ERROR } from "../utils/message.util.js";

export const getUserByPhoneNumberModel = async (phoneNumber) => {
  try {
    return await db.query(
      "SELECT * FROM users WHERE phone_number = ? AND is_deleted = 0 LIMIT 1",
      [phoneNumber],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Checking User", error, false);
  }
};

export const getUserByIdModel = async (userId) => {
  try {
    const [user] = await db.query(
      "SELECT * FROM users WHERE user_id = ? AND is_deleted = 0 LIMIT 1",
      [userId],
    );
    return user;
  } catch (error) {
    throw new ApiError(DB_ERROR, "Checking User", error, false);
  }
};

export const getUserDetailByIdModel = async (userId) => {
  try {
    const [user] = await db.query(
      `SELECT
        u.user_id,
        u.phone_number,
        u.email,
        u.full_name,
        u.location_id,
        l.district,
        l.godown,
        l.sloc,
        l.cap,
        l.remark,
        u.gender,
       u.profile_image,
       u.is_verified,
       u.is_active,
       u.is_deleted,
       u.created_at,
       u.updated_at,
       u.role
       FROM users u
       LEFT JOIN locations l ON l.location_id = u.location_id
       WHERE u.user_id = ? AND u.is_deleted = 0
       LIMIT 1`,
      [userId],
    );
    return user;
  } catch (error) {
    throw new ApiError(DB_ERROR, "Checking User", error, false);
  }
};

export const getUsersModel = async (user_id) => {
  try {
    return await db.query(
      `SELECT
        u.user_id,
        u.phone_number,
        u.email,
        u.full_name,
        u.location_id,
        l.district,
        l.godown,
        l.sloc,
        l.cap,
        l.remark,
        u.gender,
        u.profile_image,
        u.is_verified,
        u.is_active,
        u.is_deleted,
        u.created_at,
        u.updated_at,
        u.role
      FROM users u
      LEFT JOIN locations l ON l.location_id = u.location_id
      WHERE u.user_id != ? AND u.is_deleted = 0
      ORDER BY u.user_id DESC`,
      [user_id]
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching Users", error, false);
  }
};

export const createUserModel = async ({
  phone_number,
  email = null,
  full_name = null,
  location_id,
  gender = null,
  profile_image = null,
  role,
  is_active = 1,
  panel_ids = [],
}) => {
  const connection = await db.begin();

  try {
    const [userResult] = await connection.query(
      `INSERT INTO users
        (phone_number, email, full_name, location_id, gender, profile_image, role, is_active,is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?,1)`,
      [phone_number, email, full_name, location_id, gender, profile_image, role, is_active],
    );

    const userId = userResult.insertId;

    if (role === "USER" && panel_ids.length) {
      const panelValues = panel_ids.map((panelId) => [panelId, userId]);
      await connection.query(
        `INSERT INTO user_panels (panel_id, user_id)
         VALUES ?`,
        [panelValues],
      );
    }

    await db.commit(connection);
    return userId;
  } catch (error) {
    await db.rollback(connection);
    throw new ApiError(DB_ERROR, "Creating User", error, false);
  }
};

export const getUserPanelsModel = async (userId) => {
  try {
    return await db.query(
      `SELECT p.panel_id, p.panel_name, p.created_at
       FROM user_panels up
       INNER JOIN panels p ON p.panel_id = up.panel_id
       WHERE up.user_id = ?
       ORDER BY p.panel_id ASC`,
      [userId],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching User Panels", error, false);
  }
};

export const updateUserDetailsModel = async (userId, payload) => {
  const connection = await db.begin();

  try {
    const userColumns = ["phone_number", "full_name", "is_active"];
    const updates = userColumns.filter((column) => Object.prototype.hasOwnProperty.call(payload, column));

    if (updates.length) {
      const setClause = updates.map((column) => `${column} = ?`).join(", ");
      const values = updates.map((column) => payload[column]);

      await connection.query(
        `UPDATE users
         SET ${setClause}, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [...values, userId],
      );
    }

    if (Object.prototype.hasOwnProperty.call(payload, "panel_ids")) {
      await connection.query("DELETE FROM user_panels WHERE user_id = ?", [userId]);

      if (payload.panel_ids.length) {
        const panelValues = payload.panel_ids.map((panelId) => [panelId, userId]);
        await connection.query(
          `INSERT INTO user_panels (panel_id, user_id)
           VALUES ?`,
          [panelValues],
        );
      }
    }

    await db.commit(connection);
  } catch (error) {
    await db.rollback(connection);
    throw new ApiError(DB_ERROR, "Updating User", error, false);
  }
};

export const softDeleteUserModel = async (userId) => {
  try {
    return await db.query(
      `UPDATE users
       SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND is_deleted = 0`,
      [userId],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Deleting User", error, false);
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

export const clearUserFcmTokenModel = async (userId) => {
  try {
    return await db.query("UPDATE users SET fcm_token = NULL WHERE user_id = ?", [userId]);
  } catch (error) {
    throw new ApiError(DB_ERROR, "Clearing FCM Token", error, false);
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
