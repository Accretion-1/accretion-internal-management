import db from "../config/db.js";
import { insertGodownSlip, getGodownSlips, getGodownSlipById } from "../model/godown-slip.model.js";
import { CustomImagePath } from "../utils/misc.util.js";

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

const formatImageUrl = (slip) => {
  if (slip && slip.image_url) {
    slip.image_url = CustomImagePath(slip.image_url);
  }
  return slip;
};

export const fetchAdminSlips = async (query) => {
  const { date, location_id, page = 1, limit = 10 } = query;
  
  const filters = {
    slip_date: date || null,
    location_id: location_id || null,
  };
  
  const pagination = {
    limit: parseInt(limit, 10),
    offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
  };

  const result = await getGodownSlips(filters, pagination);
  result.data = result.data.map(formatImageUrl);
  return result;
};

export const fetchUserSlips = async (user, query) => {
  const { date, page = 1, limit = 10 } = query;
  
  const filters = {
    slip_date: date || null,
    location_id: user.location_id, // strictly isolated to user's location
  };
  
  const pagination = {
    limit: parseInt(limit, 10),
    offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
  };

  const result = await getGodownSlips(filters, pagination);
  result.data = result.data.map(formatImageUrl);
  return result;
};

export const fetchSlipById = async (id) => {
  const slip = await getGodownSlipById(id);
  return formatImageUrl(slip);
};
