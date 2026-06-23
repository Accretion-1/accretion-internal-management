import db from "../config/db.js";
import { ApiError } from "../utils/api.util.js";
import { DB_ERROR } from "../utils/message.util.js";

const LOCATION_COLUMNS = ["district", "godown", "sloc", "cap", "remark"];

export const getLocationsModel = async () => {
  try {
    return await db.query(
      `SELECT location_id, district, godown, sloc, cap, remark, is_deleted, created_at
       FROM locations
       WHERE is_deleted = 0
       ORDER BY location_id DESC`,
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching Locations", error, false);
  }
};

export const getLocationByIdModel = async (locationId) => {
  try {
    const [location] = await db.query(
      `SELECT location_id, district, godown, sloc, cap, remark, is_deleted, created_at
       FROM locations
       WHERE location_id = ? AND is_deleted = 0
       LIMIT 1`,
      [locationId],
    );
    return location;
  } catch (error) {
    throw new ApiError(DB_ERROR, "Checking Location", error, false);
  }
};

export const createLocationModel = async ({ district = null, godown = null, sloc = null, cap = null, remark = null }) => {
  try {
    return await db.query(
      `INSERT INTO locations (district, godown, sloc, cap, remark)
       VALUES (?, ?, ?, ?, ?)`,
      [district, godown, sloc, cap, remark],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Creating Location", error, false);
  }
};

export const updateLocationModel = async (locationId, payload) => {
  try {
    const updates = LOCATION_COLUMNS.filter((column) => Object.prototype.hasOwnProperty.call(payload, column));
    const setClause = updates.map((column) => `${column} = ?`).join(", ");
    const values = updates.map((column) => payload[column]);

    return await db.query(
      `UPDATE locations
       SET ${setClause}
       WHERE location_id = ? AND is_deleted = 0`,
      [...values, locationId],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Updating Location", error, false);
  }
};

export const softDeleteLocationModel = async (locationId) => {
  try {
    return await db.query(
      `UPDATE locations
       SET is_deleted = 1
       WHERE location_id = ? AND is_deleted = 0`,
      [locationId],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Deleting Location", error, false);
  }
};
