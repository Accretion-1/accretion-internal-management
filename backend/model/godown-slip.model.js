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

  let query = `
    SELECT gs.*, l.district, l.godown, l.sloc
    FROM godown_slips gs
    LEFT JOIN locations l ON gs.location_id = l.location_id
    WHERE 1=1
  `;
  let countQuery = `SELECT COUNT(*) as total FROM godown_slips gs WHERE 1=1`;
  const params = [];

  if (location_id) {
    query += ` AND gs.location_id = ?`;
    countQuery += ` AND gs.location_id = ?`;
    params.push(location_id);
  }

  if (slip_date) {
    query += ` AND gs.slip_date = ?`;
    countQuery += ` AND gs.slip_date = ?`;
    params.push(slip_date);
  }

  query += ` ORDER BY gs.created_at DESC LIMIT ? OFFSET ?`;
  
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
  const sql = `
    SELECT gs.*, l.district, l.godown, l.sloc
    FROM godown_slips gs
    LEFT JOIN locations l ON gs.location_id = l.location_id
    WHERE gs.slip_id = ? 
    LIMIT 1
  `;
  const results = await db.query(sql, [slip_id]);
  return results[0] || null;
};
