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
