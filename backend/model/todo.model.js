import db from "../config/db.js";
import { ApiError } from "../utils/api.util.js";
import { DB_ERROR } from "../utils/message.util.js";

const TODO_SELECT = `
  SELECT
    t.todo_id,
    t.type,
    t.schedule,
    t.is_ocr,
    t.title,
    t.description,
    t.checkbox_items,
    t.created_by,
    u.full_name AS created_by_name,
    u.phone_number AS created_by_phone_number,
    t.due_time,
    DATE_FORMAT(t.start_date, '%Y-%m-%d') AS start_date,
    DATE_FORMAT(t.end_date, '%Y-%m-%d') AS end_date,
    t.day_of_week,
    t.day_of_month,
    t.is_active,
    t.created_at,
    t.updated_at
  FROM todos t
  LEFT JOIN users u ON u.user_id = t.created_by
`;

const USER_TODO_SELECT = `
  SELECT
    t.todo_id,
    t.type,
    t.schedule,
    t.is_ocr,
    t.title,
    t.description,
    t.checkbox_items,
    t.created_by,
    u.full_name AS created_by_name,
    u.phone_number AS created_by_phone_number,
    t.due_time,
    DATE_FORMAT(t.start_date, '%Y-%m-%d') AS start_date,
    DATE_FORMAT(t.end_date, '%Y-%m-%d') AS end_date,
    t.day_of_week,
    t.day_of_month,
    t.is_active,
    t.created_at,
    t.updated_at,
    tl.todo_location_id,
    tl.location_id,
    l.district,
    l.godown,
    l.sloc,
    l.cap,
    l.remark,
    tl.created_at AS todo_location_created_at,
    tl.updated_at AS todo_location_updated_at,
    CASE WHEN tc.completion_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_completed
  FROM todos t
  INNER JOIN todo_locations tl ON tl.todo_id = t.todo_id
  INNER JOIN locations l ON l.location_id = tl.location_id
  LEFT JOIN users u ON u.user_id = t.created_by
`;

const LOCAL_NOW_SQL = "CONVERT_TZ(NOW(), @@session.time_zone, '+05:30')";
const LOCAL_DATE_SQL = `DATE(${LOCAL_NOW_SQL})`;
const LOCAL_TIME_SQL = `TIME(${LOCAL_NOW_SQL})`;

const USER_TODO_COMPLETION_JOIN = `
  LEFT JOIN (
    SELECT
      MIN(completion_id) AS completion_id,
      todo_id,
      todo_location_id,
      completed_by,
      MAX(completion_date = ${LOCAL_DATE_SQL}) AS completed_today
    FROM todo_completions
    GROUP BY todo_id, todo_location_id, completed_by
  ) tc ON tc.todo_id = t.todo_id
    AND tc.todo_location_id = tl.todo_location_id
    AND tc.completed_by = ?
    AND (
      t.schedule = 'single'
      OR tc.completed_today = 1
    )
`;

const USER_TODO_WHERE = `
  WHERE tl.location_id = ?
    AND tl.is_deleted = FALSE
    AND t.is_active = TRUE
    AND t.start_date <= ${LOCAL_DATE_SQL}
    AND (t.end_date IS NULL OR t.end_date >= ${LOCAL_DATE_SQL})
    AND (
      t.due_time IS NULL
      OR ${LOCAL_TIME_SQL} >= SUBTIME(t.due_time, '02:00:00')
    )
    AND (
      t.schedule = 'daily'
      OR (t.schedule = 'weekly' AND t.day_of_week = CASE WHEN DAYOFWEEK(${LOCAL_DATE_SQL}) = 1 THEN 7 ELSE DAYOFWEEK(${LOCAL_DATE_SQL}) - 1 END)
      OR (t.schedule = 'monthly' AND t.day_of_month = DAY(${LOCAL_DATE_SQL}))
      OR (t.schedule = 'single' AND t.start_date <= ${LOCAL_DATE_SQL} AND (t.end_date IS NULL OR t.end_date >= ${LOCAL_DATE_SQL}))
    )
`;

const buildUserTodoStatusFilter = (status, values) => {
  if (status === "active") {
    values.push(0);
    return " AND (tc.completion_id IS NOT NULL) = ? ";
  }

  if (status === "completed") {
    values.push(1);
    return " AND (tc.completion_id IS NOT NULL) = ? ";
  }

  return "";
};

const sqlDateParam = (values, date) => {
  if (date) {
    values.push(date);
    return "?";
  }

  return "CURDATE()";
};

export const createTodoModel = async ({
  type,
  schedule,
  is_ocr = null,
  title,
  description = null,
  checkbox_items = null,
  location_ids = [],
  created_by,
  due_time = null,
  start_date = null,
  end_date = null,
  day_of_week = null,
  day_of_month = null,
  is_active = 1,
}) => {
  const connection = await db.begin();

  try {
    const [todoResult] = await connection.query(
      `INSERT INTO todos
        (type, schedule, is_ocr, title, description, checkbox_items, created_by, due_time, start_date, end_date, day_of_week, day_of_month, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type,
        schedule,
        is_ocr,
        title,
        description,
        checkbox_items,
        created_by,
        due_time,
        start_date,
        end_date,
        day_of_week,
        day_of_month,
        is_active,
      ],
    );

    const todoId = todoResult.insertId;

    if (location_ids.length) {
      const locationValues = location_ids.map((locationId) => [todoId, locationId]);
      await connection.query(
        `INSERT INTO todo_locations (todo_id, location_id)
         VALUES ?`,
        [locationValues],
      );
    }

    await db.commit(connection);
    return todoResult;
  } catch (error) {
    await db.rollback(connection);
    throw new ApiError(DB_ERROR, "Creating Todo", error, false);
  }
};

export const getTodosModel = async ({ location_id = null } = {}) => {
  try {
    const whereClauses = [];
    const values = [];

    if (location_id) {
      whereClauses.push(`
        EXISTS (
          SELECT 1
          FROM todo_locations tl_filter
          WHERE tl_filter.todo_id = t.todo_id
            AND tl_filter.location_id = ?
            AND tl_filter.is_deleted = 0
        )
      `);
      values.push(location_id);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";

    return await db.query(
      `${TODO_SELECT}
       ${whereSql}
       ORDER BY t.start_date ASC, t.todo_id ASC`,
      values,
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching Todos", error, false);
  }
};

export const getTodoLocationsByTodoIdsModel = async (todoIds = []) => {
  try {
    if (!todoIds.length) return [];

    return await db.query(
      `SELECT
        tl.todo_location_id,
        tl.todo_id,
        tl.location_id,
        l.district,
        l.godown,
        l.sloc,
        l.cap,
        l.remark,
        tl.created_at,
        tl.updated_at
       FROM todo_locations tl
       INNER JOIN locations l ON l.location_id = tl.location_id
       WHERE tl.todo_id IN (?) AND tl.is_deleted = 0
       ORDER BY tl.todo_id DESC, tl.todo_location_id ASC`,
      [todoIds],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching Todo Locations", error, false);
  }
};

export const getTodoByIdModel = async (todoId) => {
  try {
    const [todo] = await db.query(
      `${TODO_SELECT}
       WHERE t.todo_id = ?
       LIMIT 1`,
      [todoId],
    );
    return todo;
  } catch (error) {
    throw new ApiError(DB_ERROR, "Checking Todo", error, false);
  }
};

export const updateTodoModel = async (todoId, payload) => {
  const connection = await db.begin();

  try {
    const { location_ids, ...todoPayload } = payload;
    const fields = [];
    const values = [];

    Object.entries(todoPayload).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length) {
      await connection.query(
        `UPDATE todos
         SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
         WHERE todo_id = ?`,
        [...values, todoId],
      );
    }

    if (Array.isArray(location_ids)) {
      const [existingMappings] = await connection.query(
        `SELECT todo_location_id, location_id, is_deleted
         FROM todo_locations
         WHERE todo_id = ?`,
        [todoId],
      );

      const requestedLocationIds = [...new Set(location_ids.map((locationId) => Number(locationId)))];
      const requestedLocationSet = new Set(requestedLocationIds);
      const existingLocationSet = new Set(
        existingMappings.map((mapping) => Number(mapping.location_id)),
      );
      const activeLocationIds = existingMappings
        .filter((mapping) => Number(mapping.is_deleted) === 0)
        .map((mapping) => Number(mapping.location_id));
      const softDeleteLocationIds = activeLocationIds.filter(
        (locationId) => !requestedLocationSet.has(locationId),
      );
      const reactivateLocationIds = existingMappings
        .filter(
          (mapping) =>
            Number(mapping.is_deleted) === 1 &&
            requestedLocationSet.has(Number(mapping.location_id)),
        )
        .map((mapping) => Number(mapping.location_id));
      const insertLocationIds = requestedLocationIds.filter(
        (locationId) => !existingLocationSet.has(locationId),
      );

      if (softDeleteLocationIds.length) {
        await connection.query(
          `UPDATE todo_locations
           SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
           WHERE todo_id = ? AND location_id IN (?)`,
          [todoId, softDeleteLocationIds],
        );
      }

      if (reactivateLocationIds.length) {
        await connection.query(
          `UPDATE todo_locations
           SET is_deleted = 0, updated_at = CURRENT_TIMESTAMP
           WHERE todo_id = ? AND location_id IN (?)`,
          [todoId, reactivateLocationIds],
        );
      }

      if (insertLocationIds.length) {
        const locationValues = insertLocationIds.map((locationId) => [todoId, locationId]);
        await connection.query(
          `INSERT INTO todo_locations (todo_id, location_id)
           VALUES ?`,
          [locationValues],
        );
      }
    }

    await db.commit(connection);
    return true;
  } catch (error) {
    await db.rollback(connection);
    throw new ApiError(DB_ERROR, "Updating Todo", error, false);
  }
};

export const getUserEligibleTodosModel = async ({
  user_id,
  location_id,
  status = null,
  page = 1,
  limit = 10,
}) => {
  try {
    const offset = (page - 1) * limit;
    const values = [user_id, location_id];
    const statusSql = buildUserTodoStatusFilter(status, values);

    return await db.query(
      `${USER_TODO_SELECT}
       ${USER_TODO_COMPLETION_JOIN}
       ${USER_TODO_WHERE}
       ${statusSql}
       ORDER BY t.start_date ASC, t.todo_id ASC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching User Todos", error, false);
  }
};

export const countUserEligibleTodosModel = async ({
  user_id,
  location_id,
  status = null,
}) => {
  try {
    const values = [user_id, location_id];
    const statusSql = buildUserTodoStatusFilter(status, values);
    const [result] = await db.query(
      `SELECT COUNT(*) AS total_records
       FROM todos t
       INNER JOIN todo_locations tl ON tl.todo_id = t.todo_id
       ${USER_TODO_COMPLETION_JOIN}
       ${USER_TODO_WHERE}
       ${statusSql}`,
      values,
    );

    return Number(result?.total_records || 0);
  } catch (error) {
    throw new ApiError(DB_ERROR, "Counting User Todos", error, false);
  }
};

export const getUserEligibleTodoByIdModel = async ({
  todo_id,
  user_id,
  location_id,
  status = null,
}) => {
  try {
    const values = [user_id, location_id, todo_id];
    const statusSql = buildUserTodoStatusFilter(status, values);
    const [todo] = await db.query(
      `${USER_TODO_SELECT}
       ${USER_TODO_COMPLETION_JOIN}
       ${USER_TODO_WHERE}
       AND t.todo_id = ?
       ${statusSql}
       LIMIT 1`,
      values,
    );

    return todo;
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching User Todo", error, false);
  }
};

export const completeTodoModel = async ({
  todo_id,
  todo_location_id,
  completed_by,
  stock_items = [],
  checkbox_items_response = null,
  remarks = null,
  files = [],
}) => {
  const connection = await db.begin();

  try {
    const [completionResult] = await connection.query(
      `INSERT INTO todo_completions
        (todo_id, todo_location_id, completed_by, completion_date, checkbox_items_response, remarks)
       VALUES (?, ?, ?, CURDATE(), ?, ?)`,
      [
        todo_id,
        todo_location_id,
        completed_by,
        checkbox_items_response,
        remarks,
      ],
    );

    const completionId = completionResult.insertId;

    if (stock_items.length) {
      const stockValues = stock_items.map((item) => [
        completionId,
        item.stock_name,
        item.stock_value,
        item.week,
      ]);

      await connection.query(
        `INSERT INTO todo_completion_items (completion_id, stock_name, stock_value, week)
         VALUES ?`,
        [stockValues],
      );
    }

    if (files.length) {
      const fileValues = files.map((file) => [
        completionId,
        file.file_type,
        file.file_url,
      ]);

      await connection.query(
        `INSERT INTO todo_completion_files (completion_id, file_type, file_url)
         VALUES ?`,
        [fileValues],
      );
    }

    await db.commit(connection);

    return {
      completion_id: completionId,
      todo_id,
      todo_location_id,
      completed_by,
      stock_items,
      checkbox_items_response,
      remarks,
      files,
    };
  } catch (error) {
    await db.rollback(connection);
    throw new ApiError(DB_ERROR, "Completing Todo", error, false);
  }
};

export const getTodoCompletionsModel = async ({
  todo_id,
  location_id = null,
  date = null,
  page = 1,
  limit = 10,
}) => {
  try {
    const offset = (page - 1) * limit;
    const values = [todo_id];
    const locationFilter = location_id ? " AND tl.location_id = ? " : "";
    const dateFilter = date ? " AND tc.completion_date = ? " : "";

    if (location_id) values.push(location_id);
    if (date) values.push(date);

    return await db.query(
      `SELECT
        tc.completion_id,
        tc.todo_id,
        tc.todo_location_id,
        tc.completed_by,
        u.full_name AS completed_by_name,
        u.phone_number AS completed_by_phone_number,
        DATE_FORMAT(tc.completion_date, '%Y-%m-%d') AS completion_date,
        tc.checkbox_items_response,
        tc.remarks,
        tc.completed_at,
        tc.updated_at,
        tl.location_id,
        l.district,
        l.godown,
        l.sloc,
        l.cap,
        l.remark AS location_remark
       FROM todo_completions tc
       INNER JOIN todo_locations tl ON tl.todo_location_id = tc.todo_location_id
       INNER JOIN locations l ON l.location_id = tl.location_id
       LEFT JOIN users u ON u.user_id = tc.completed_by
       WHERE tc.todo_id = ?
       ${locationFilter}
       ${dateFilter}
       ORDER BY tc.completion_date DESC, tc.completed_at DESC, tc.completion_id DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching Todo Completions", error, false);
  }
};

export const getCompletionItemsByCompletionIdsModel = async (completionIds = []) => {
  try {
    if (!completionIds.length) return [];

    return await db.query(
      `SELECT
        todo_completion_item_id,
        completion_id,
        stock_name,
        stock_value,
        week,
        created_at
       FROM todo_completion_items
       WHERE completion_id IN (?)
       ORDER BY completion_id ASC, week ASC, todo_completion_item_id ASC`,
      [completionIds],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching Todo Completion Items", error, false);
  }
};

export const countTodoCompletionsModel = async ({ todo_id, location_id = null, date = null }) => {
  try {
    const values = [todo_id];
    const locationFilter = location_id ? " AND tl.location_id = ? " : "";
    const dateFilter = date ? " AND tc.completion_date = ? " : "";

    if (location_id) values.push(location_id);
    if (date) values.push(date);

    const [result] = await db.query(
      `SELECT COUNT(*) AS total_records
       FROM todo_completions tc
       INNER JOIN todo_locations tl ON tl.todo_location_id = tc.todo_location_id
       WHERE tc.todo_id = ?
       ${locationFilter}
       ${dateFilter}`,
      values,
    );

    return Number(result?.total_records || 0);
  } catch (error) {
    throw new ApiError(DB_ERROR, "Counting Todo Completions", error, false);
  }
};

const buildStockCompletionReportWhere = ({
  location_id,
  location_ids = [],
  todo_id,
  start_date,
  end_date,
  values,
}) => {
  let whereSql = "WHERE t.type = 'stock'";

  if (location_id) {
    whereSql += " AND tl.location_id = ?";
    values.push(location_id);
  }

  if (Array.isArray(location_ids) && location_ids.length) {
    whereSql += " AND tl.location_id IN (?)";
    values.push(location_ids);
  }

  if (todo_id) {
    whereSql += " AND tc.todo_id = ?";
    values.push(todo_id);
  }

  if (start_date) {
    whereSql += " AND tc.completion_date >= ?";
    values.push(start_date);
  }

  if (end_date) {
    whereSql += " AND tc.completion_date <= ?";
    values.push(end_date);
  }

  return whereSql;
};

export const getStockCompletionReportModel = async ({
  location_id,
  location_ids = [],
  todo_id,
  start_date,
  end_date,
  page = 1,
  limit = 20,
}) => {
  try {
    const values = [];
    const whereSql = buildStockCompletionReportWhere({
      location_id,
      location_ids,
      todo_id,
      start_date,
      end_date,
      values,
    });
    const offset = (page - 1) * limit;

    return await db.query(
      `SELECT
        tc.completion_id,
        tc.todo_id,
        tc.todo_location_id,
        tc.completed_by,
        DATE_FORMAT(tc.completion_date, '%Y-%m-%d') AS completion_date,
        tc.remarks,
        tc.completed_at,
        tc.updated_at,
        t.title AS todo_title,
        t.description AS todo_description,
        t.schedule AS todo_schedule,
        t.due_time AS todo_due_time,
        u.full_name AS completed_by_name,
        u.phone_number AS completed_by_phone_number,
        tl.location_id,
        l.district,
        l.godown,
        l.sloc,
        l.cap,
        l.remark AS location_remark
       FROM todo_completions tc
       INNER JOIN todos t ON t.todo_id = tc.todo_id
       INNER JOIN todo_locations tl ON tl.todo_location_id = tc.todo_location_id
       INNER JOIN locations l ON l.location_id = tl.location_id
       LEFT JOIN users u ON u.user_id = tc.completed_by
       ${whereSql}
       ORDER BY tc.completion_date DESC, tc.completed_at DESC, tc.completion_id DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching Stock Completion Report", error, false);
  }
};

export const countStockCompletionReportModel = async ({
  location_id,
  location_ids = [],
  todo_id,
  start_date,
  end_date,
}) => {
  try {
    const values = [];
    const whereSql = buildStockCompletionReportWhere({
      location_id,
      location_ids,
      todo_id,
      start_date,
      end_date,
      values,
    });

    const [result] = await db.query(
      `SELECT COUNT(*) AS total_records
       FROM todo_completions tc
       INNER JOIN todos t ON t.todo_id = tc.todo_id
       INNER JOIN todo_locations tl ON tl.todo_location_id = tc.todo_location_id
       ${whereSql}`,
      values,
    );

    return Number(result?.total_records || 0);
  } catch (error) {
    throw new ApiError(DB_ERROR, "Counting Stock Completion Report", error, false);
  }
};

export const getCompletionFilesByCompletionIdsModel = async (completionIds = []) => {
  try {
    if (!completionIds.length) return [];

    return await db.query(
      `SELECT file_id, completion_id, file_type, file_url, created_at
       FROM todo_completion_files
       WHERE completion_id IN (?)
       ORDER BY file_id ASC`,
      [completionIds],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching Todo Completion Files", error, false);
  }
};

export const getAdminManagerTodayTodosModel = async ({
  location_id = null,
  todo_id = null,
  status = null,
  date = null,
  page = 1,
  limit = 10,
}) => {
  try {
    const offset = (page - 1) * limit;
    const values = [];
    const targetDate = date || null;

    let whereSql = `
      WHERE tl.is_deleted = FALSE
        AND t.is_active = TRUE
        AND t.start_date <= ${sqlDateParam(values, targetDate)}
        AND (t.end_date IS NULL OR t.end_date >= ${sqlDateParam(values, targetDate)})
        AND (
          t.schedule = 'daily'
          OR (t.schedule = 'weekly' AND t.day_of_week = CASE WHEN DAYOFWEEK(${sqlDateParam(values, targetDate)}) = 1 THEN 7 ELSE DAYOFWEEK(${sqlDateParam(values, targetDate)}) - 1 END)
          OR (t.schedule = 'monthly' AND t.day_of_month = DAY(${sqlDateParam(values, targetDate)}))
          OR (t.schedule = 'single' AND t.start_date <= ${sqlDateParam(values, targetDate)} AND (t.end_date IS NULL OR t.end_date >= ${sqlDateParam(values, targetDate)}))
        )
    `;

    if (location_id) {
      whereSql += ` AND tl.location_id = ? `;
      values.push(location_id);
    }

    if (todo_id) {
      whereSql += ` AND t.todo_id = ? `;
      values.push(todo_id);
    }

    if (status === "active") {
      whereSql += ` AND tc.completion_id IS NULL `;
    } else if (status === "completed") {
      whereSql += ` AND tc.completion_id IS NOT NULL `;
    }

    const querySql = `
      SELECT
        t.todo_id,
        t.type,
        t.schedule,
        t.is_ocr,
        t.title,
        t.description,
        t.checkbox_items,
        t.created_by,
        u_creator.full_name AS created_by_name,
        u_creator.phone_number AS created_by_phone_number,
        t.due_time,
        DATE_FORMAT(t.start_date, '%Y-%m-%d') AS start_date,
        DATE_FORMAT(t.end_date, '%Y-%m-%d') AS end_date,
        t.day_of_week,
        t.day_of_month,
        t.is_active,
        t.created_at,
        t.updated_at,
        tl.todo_location_id,
        tl.location_id,
        l.district,
        l.godown,
        l.sloc,
        l.cap,
        l.remark AS location_remark,
        tl.created_at AS todo_location_created_at,
        tl.updated_at AS todo_location_updated_at,
        CASE WHEN tc.completion_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_completed,
        tc.completion_id,
        tc.completed_by,
        u_completer.full_name AS completed_by_name,
        u_completer.phone_number AS completed_by_phone_number,
        DATE_FORMAT(tc.completion_date, '%Y-%m-%d') AS completion_date,
        tc.completed_at,
        tc.checkbox_items_response,
        tc.remarks
      FROM todos t
      INNER JOIN todo_locations tl ON tl.todo_id = t.todo_id
      INNER JOIN locations l ON l.location_id = tl.location_id
      LEFT JOIN users u_creator ON u_creator.user_id = t.created_by
      LEFT JOIN (
        SELECT
          tc_sub.completion_id,
          tc_sub.todo_id,
          tc_sub.todo_location_id,
          tc_sub.completed_by,
          DATE_FORMAT(tc_sub.completion_date, '%Y-%m-%d') AS completion_date,
          tc_sub.completed_at,
          tc_sub.checkbox_items_response,
          tc_sub.remarks
        FROM todo_completions tc_sub
        INNER JOIN (
          SELECT 
            todo_id,
            todo_location_id,
            MAX(completion_id) AS max_completion_id
          FROM todo_completions
          WHERE completion_date = ${sqlDateParam(values, targetDate)}
             OR todo_id IN (SELECT todo_id FROM todos WHERE schedule = 'single')
          GROUP BY todo_id, todo_location_id
        ) latest ON tc_sub.completion_id = latest.max_completion_id
      ) tc ON tc.todo_id = t.todo_id AND tc.todo_location_id = tl.todo_location_id
      LEFT JOIN users u_completer ON u_completer.user_id = tc.completed_by
      ${whereSql}
      ORDER BY t.start_date ASC, t.todo_id ASC, tl.location_id ASC
      LIMIT ? OFFSET ?
    `;

    return await db.query(querySql, [...values, limit, offset]);
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching Admin/Manager Today Todos", error, false);
  }
};

export const countAdminManagerTodayTodosModel = async ({
  location_id = null,
  todo_id = null,
  status = null,
  date = null,
}) => {
  try {
    const values = [];
    const targetDate = date || null;

    let whereSql = `
      WHERE tl.is_deleted = FALSE
        AND t.is_active = TRUE
        AND t.start_date <= ${sqlDateParam(values, targetDate)}
        AND (t.end_date IS NULL OR t.end_date >= ${sqlDateParam(values, targetDate)})
        AND (
          t.schedule = 'daily'
          OR (t.schedule = 'weekly' AND t.day_of_week = CASE WHEN DAYOFWEEK(${sqlDateParam(values, targetDate)}) = 1 THEN 7 ELSE DAYOFWEEK(${sqlDateParam(values, targetDate)}) - 1 END)
          OR (t.schedule = 'monthly' AND t.day_of_month = DAY(${sqlDateParam(values, targetDate)}))
          OR (t.schedule = 'single' AND t.start_date <= ${sqlDateParam(values, targetDate)} AND (t.end_date IS NULL OR t.end_date >= ${sqlDateParam(values, targetDate)}))
        )
    `;

    if (location_id) {
      whereSql += ` AND tl.location_id = ? `;
      values.push(location_id);
    }

    if (todo_id) {
      whereSql += ` AND t.todo_id = ? `;
      values.push(todo_id);
    }

    if (status === "active") {
      whereSql += ` AND tc.completion_id IS NULL `;
    } else if (status === "completed") {
      whereSql += ` AND tc.completion_id IS NOT NULL `;
    }

    const countSql = `
      SELECT COUNT(*) AS total_records
      FROM todos t
      INNER JOIN todo_locations tl ON tl.todo_id = t.todo_id
      LEFT JOIN (
        SELECT
          todo_id,
          todo_location_id,
          MAX(completion_id) AS completion_id
        FROM todo_completions
        WHERE completion_date = ${sqlDateParam(values, targetDate)}
           OR todo_id IN (SELECT todo_id FROM todos WHERE schedule = 'single')
        GROUP BY todo_id, todo_location_id
      ) tc ON tc.todo_id = t.todo_id AND tc.todo_location_id = tl.todo_location_id
      ${whereSql}
    `;

    const [result] = await db.query(countSql, values);
    return Number(result?.total_records || 0);
  } catch (error) {
    throw new ApiError(DB_ERROR, "Counting Admin/Manager Today Todos", error, false);
  }
};

export const getPendingTodoReminderTargetsModel = async (reminderIntervalMinutes = 60) => {
  try {
    return await db.query(
      `SELECT
    t.todo_id,
    t.type,
    t.schedule,
    t.is_ocr,
    t.title,
    t.description,
    t.due_time,
    t.last_reminder_sent_at,
    DATE_FORMAT(t.start_date, '%Y-%m-%d') AS start_date,
    DATE_FORMAT(t.end_date, '%Y-%m-%d') AS end_date,
    t.day_of_week,
    t.day_of_month,
    tl.todo_location_id,
    tl.location_id,
    l.district,
    l.godown,
    l.sloc,
    l.cap,
    l.remark AS location_remark,
    u.user_id,
    u.full_name,
    u.phone_number,
    u.fcm_token
FROM todos t
INNER JOIN todo_locations tl ON tl.todo_id = t.todo_id
INNER JOIN locations l ON l.location_id = tl.location_id
INNER JOIN users u ON u.location_id = tl.location_id
    AND u.role = 'USER'
    AND u.is_active = TRUE
    AND u.fcm_token IS NOT NULL
    AND u.fcm_token <> ''
LEFT JOIN todo_completions tc ON tc.todo_id = t.todo_id
    AND tc.todo_location_id = tl.todo_location_id
    AND tc.completed_by = u.user_id
    AND (
        t.schedule = 'single'
        OR tc.completion_date = DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'Asia/Kolkata'))
    )
WHERE tl.is_deleted = FALSE
    AND t.is_active = TRUE
    AND t.due_time IS NOT NULL
    -- Convert current server time to IST and add 1-minute buffer
    AND t.due_time <= DATE_ADD(
        TIME(CONVERT_TZ(NOW(), @@session.time_zone, 'Asia/Kolkata')),
        INTERVAL 1 MINUTE
    )
    -- Convert dates to IST
    AND t.start_date <= DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'Asia/Kolkata'))
    AND (t.end_date IS NULL OR t.end_date >= DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'Asia/Kolkata')))
    AND (
        t.schedule = 'daily'
        OR (t.schedule = 'weekly' AND t.day_of_week = 
            CASE 
                WHEN DAYOFWEEK(DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'Asia/Kolkata'))) = 1 
                THEN 7 
                ELSE DAYOFWEEK(DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'Asia/Kolkata'))) - 1 
            END)
        OR (t.schedule = 'monthly' AND t.day_of_month = 
            DAY(DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'Asia/Kolkata')))
        )
        OR (t.schedule = 'single' 
            AND t.start_date <= DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'Asia/Kolkata')) 
            AND (t.end_date IS NULL OR t.end_date >= DATE(CONVERT_TZ(NOW(), @@session.time_zone, 'Asia/Kolkata')))
        )
    )
    AND tc.completion_id IS NULL
    AND (
        t.last_reminder_sent_at IS NULL
        OR UTC_TIMESTAMP() >= DATE_ADD(CONVERT_TZ(t.last_reminder_sent_at, @@session.time_zone, '+00:00'), INTERVAL ? MINUTE)
    )
ORDER BY t.due_time ASC, t.todo_id ASC, tl.location_id ASC, u.user_id ASC`,
      [reminderIntervalMinutes],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching Todo Reminder Targets", error, false);
  }
};

export const updateTodoLastReminderSentAtModel = async (todoId) => {
  try {
    return await db.query(
      `UPDATE todos SET last_reminder_sent_at = CURRENT_TIMESTAMP WHERE todo_id = ?`,
      [todoId],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Updating Todo Last Reminder Sent At", error, false);
  }
};

export const getAdminManagerTodayUniqueTodosModel = async ({
  date = null,
  location_id = null,
} = {}) => {
  try {
    const values = [];
    const targetDate = date || null;
    const locationFilterSql = location_id ? "AND tl.location_id = ?" : "";
    if (location_id) {
      values.push(location_id);
    }

    const querySql = `
      SELECT
        t.todo_id,
        t.title,
        MIN(t.start_date) AS start_date
      FROM todos t
      INNER JOIN todo_locations tl ON tl.todo_id = t.todo_id
      WHERE tl.is_deleted = FALSE
        AND t.is_active = TRUE
        ${locationFilterSql}
        AND t.start_date <= ${sqlDateParam(values, targetDate)}
        AND (t.end_date IS NULL OR t.end_date >= ${sqlDateParam(values, targetDate)})
        AND (
          t.schedule = 'daily'
          OR (t.schedule = 'weekly' AND t.day_of_week = CASE WHEN DAYOFWEEK(${sqlDateParam(values, targetDate)}) = 1 THEN 7 ELSE DAYOFWEEK(${sqlDateParam(values, targetDate)}) - 1 END)
          OR (t.schedule = 'monthly' AND t.day_of_month = DAY(${sqlDateParam(values, targetDate)}))
          OR (t.schedule = 'single' AND t.start_date <= ${sqlDateParam(values, targetDate)} AND (t.end_date IS NULL OR t.end_date >= ${sqlDateParam(values, targetDate)}))
        )
      GROUP BY t.todo_id, t.title
      ORDER BY start_date ASC, t.title ASC, t.todo_id ASC
    `;

    return await db.query(querySql, values);
  } catch (error) {
    throw new ApiError(DB_ERROR, "Fetching Today Unique Todos", error, false);
  }
};
