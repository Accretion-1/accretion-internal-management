import db from "../config/db.js";
import { insertGodownSlip } from "../model/godown-slip.model.js";

/**
 * Service to handle uploading and saving multiple godown slips
 */
export const processAndSaveGodownSlips = async (user, files) => {
  const connection = await db.begin();
  try {
    const insertedSlips = [];

    const { user_id, location_id } = user;

    for (const file of files) {
      const imageUrl = `/godown_slips/${file.filename}`;
      
      const result = await insertGodownSlip(connection, {
        user_id,
        location_id,
        image_url: imageUrl,
      });

      insertedSlips.push({
        slip_id: result.insertId,
        image_url: imageUrl,
      });
    }

    await db.commit(connection);
    return insertedSlips;
  } catch (error) {
    await db.rollback(connection);
    throw error;
  }
};
