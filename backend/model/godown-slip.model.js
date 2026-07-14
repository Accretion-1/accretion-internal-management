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

/**
 * Get paginated and filtered godown slips
 */
export const getGodownSlips = async (filters, pagination) => {
  const { limit, offset } = pagination;
  const { location_id, slip_date } = filters;

  let query = `SELECT * FROM godown_slips WHERE 1=1`;
  let countQuery = `SELECT COUNT(*) as total FROM godown_slips WHERE 1=1`;
  const params = [];

  if (location_id) {
    query += ` AND location_id = ?`;
    countQuery += ` AND location_id = ?`;
    params.push(location_id);
  }

  if (slip_date) {
    query += ` AND slip_date = ?`;
    countQuery += ` AND slip_date = ?`;
    params.push(slip_date);
  }

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  
  const results = await db.query(query, [...params, limit, offset]);
  const countResult = await db.query(countQuery, params);
  
  return {
    data: results,
    total: countResult[0]?.total || 0
  };
};

/**
 * Get a single godown slip by ID
 */
export const getGodownSlipById = async (slip_id) => {
  const sql = `SELECT * FROM godown_slips WHERE slip_id = ? LIMIT 1`;
  const results = await db.query(sql, [slip_id]);
  return results[0] || null;
};
