import db from "../config/db.js";
import { ApiError } from "../utils/api.util.js";
import { DB_ERROR } from "../utils/message.util.js";

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

export const updateGodownSlipManualReview = async (connection, slipId, payload) => {
  try {
    const allowedColumns = [
      "slip_number",
      "slip_date",
      "godown_name",
      "cement_type",
      "bag_count",
      "block_number",
      "vehicle_number",
      "dispatch_number",
      "customer_name",
      "destination",
      "material_load_type",
      "validity_date",
      "ocr_confidence",
      "status",
      "remarks",
    ];

    const updates = allowedColumns.filter((column) =>
      Object.prototype.hasOwnProperty.call(payload, column),
    );

    const setClauses = updates.map((column) => `${column} = ?`);
    const values = updates.map((column) => payload[column]);

    setClauses.push("reviewed_by = ?");
    values.push(payload.reviewed_by);

    setClauses.push("reviewed_at = CURRENT_TIMESTAMP");

    await connection.query(
      `UPDATE godown_slips
       SET ${setClauses.join(", ")}
       WHERE slip_id = ?`,
      [...values, slipId],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Updating Godown Slip Manual Review", error, false);
  }
};

/**
 * Get all pending godown slips for OCR processing
 */
export const getPendingGodownSlips = async () => {
  const sql = `SELECT * FROM godown_slips WHERE status = 'pending' ORDER BY created_at ASC`;
  const results = await db.query(sql, []);
  return results;
};

export const getVerifiedGodownSlipsForMasterDataSync = async (reviewedAfter = null) => {
  try {
    let sql = `
      SELECT
        slip_id,
        reviewed_by,
        reviewed_at,
        godown_name,
        customer_name,
        cement_type,
        vehicle_number,
        slip_number
      FROM godown_slips
      WHERE status = 'verified'
        AND reviewed_at IS NOT NULL
    `;
    const params = [];

    if (reviewedAfter) {
      sql += ` AND reviewed_at > ?`;
      params.push(reviewedAfter);
    }

    sql += ` ORDER BY reviewed_at ASC, slip_id ASC`;

    return await db.query(sql, params);
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching Verified Godown Slips For Master Data Sync", error, false);
  }
};

/**
 * Update godown slip with OCR results and calculated status
 */
export const updateGodownSlipOcrResult = async (connection, slip_id, updateData) => {
  const sql = `
    UPDATE godown_slips SET 
      cement_type = ?,
      bag_count = ?,
      slip_number = ?,
      vehicle_number = ?,
      customer_name = ?,
      status = ?
    WHERE slip_id = ?
  `;
  
  const values = [
    updateData.cement_type || 'UNKNOWN',
    updateData.bag_count || null,
    updateData.slip_number || null,
    updateData.vehicle_number || null,
    updateData.customer_name || null,
    updateData.status || 'pending',
    slip_id
  ];

  await connection.query(sql, values);
};

/**
 * Insert raw OCR output into godown_slip_ocr table
 */
export const insertGodownSlipOcr = async (connection, ocrData) => {
  const sql = `
    INSERT INTO godown_slip_ocr (
      slip_id, ocr_engine, raw_text, raw_json, processing_time_ms
    ) VALUES (?, ?, ?, ?, ?)
  `;
  
  const values = [
    ocrData.slip_id,
    ocrData.ocr_engine || 'default',
    ocrData.raw_text || null,
    JSON.stringify(ocrData.raw_json || {}),
    ocrData.processing_time_ms || 0
  ];

  await connection.query(sql, values);
};
