import db from "../config/db.js";
import { ApiError } from "../utils/api.util.js";
import { DB_ERROR } from "../utils/message.util.js";

const TODO_SELECT = `
  SELECT
    t.todo_id,
    t.type,
    t.schedule,
    t.title,
    t.description,
    t.created_by,
    u.full_name AS created_by_name,
    u.phone_number AS created_by_phone_number,
    t.due_time,
    t.start_date,
    t.end_date,
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
    t.title,
    t.description,
    t.created_by,
    u.full_name AS created_by_name,
    u.phone_number AS created_by_phone_number,
    t.due_time,
    t.start_date,
    t.end_date,
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

const USER_TODO_COMPLETION_JOIN = `
  LEFT JOIN (
    SELECT
      MIN(completion_id) AS completion_id,
      todo_id,
      todo_location_id,
      completed_by,
      MAX(completion_date = CURDATE()) AS completed_today
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
    AND t.start_date <= CURDATE()
    AND (t.end_date IS NULL OR t.end_date >= CURDATE())
    AND (
      t.schedule = 'daily'
      OR (t.schedule = 'weekly' AND t.day_of_week = CASE WHEN DAYOFWEEK(CURDATE()) = 1 THEN 7 ELSE DAYOFWEEK(CURDATE()) - 1 END)
      OR (t.schedule = 'monthly' AND t.day_of_month = DAY(CURDATE()))
      OR (t.schedule = 'single' AND CURDATE() BETWEEN t.start_date AND t.end_date)
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

export const createTodoModel = async ({
  type,
  schedule,
  title,
  description = null,
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
        (type, schedule, title, description, created_by, due_time, start_date, end_date, day_of_week, day_of_month, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type,
        schedule,
        title,
        description,
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
       ORDER BY t.todo_id DESC`,
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
       ORDER BY t.todo_id DESC
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
