import db from "../config/db.js";
import { ApiError } from "../utils/api.util.js";
import { DB_ERROR } from "../utils/message.util.js";

export const getPanelsModel = async () => {
  try {
    return await db.query(
      `SELECT panel_id, panel_name, created_at
       FROM panels
       ORDER BY panel_id ASC`,
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching Panels", error, false);
  }
};

export const getPanelsByIdsModel = async (panelIds) => {
  try {
    if (!panelIds.length) return [];

    return await db.query(
      `SELECT panel_id, panel_name, created_at
       FROM panels
       WHERE panel_id IN (?)`,
      [panelIds],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Checking Panels", error, false);
  }
};
