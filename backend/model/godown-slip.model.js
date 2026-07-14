import db from "../config/db.js";

/**
 * Insert a new godown slip record into the database
 */
export const insertGodownSlip = async (connection, data) => {
  const sql = `
    INSERT INTO godown_slips (
      user_id, location_id, image_url, status
    ) VALUES (?, ?, ?, 'pending')
  `;

  const values = [
    data.user_id,
    data.location_id || null,
    data.image_url
  ];

  const result = await connection.query(sql, values);
  return result[0];
};
