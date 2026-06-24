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
    t.location_id,
    l.district,
    l.godown,
    l.sloc,
    l.cap,
    l.remark,
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
  LEFT JOIN locations l ON l.location_id = t.location_id
  LEFT JOIN users u ON u.user_id = t.created_by
`;

export const createTodoModel = async ({
  type,
  schedule,
  title,
  description = null,
  location_id,
  created_by,
  due_time = null,
  start_date = null,
  end_date = null,
  day_of_week = null,
  day_of_month = null,
  is_active = 1,
}) => {
  try {
    return await db.query(
      `INSERT INTO todos
        (type, schedule, title, description, location_id, created_by, due_time, start_date, end_date, day_of_week, day_of_month, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type,
        schedule,
        title,
        description,
        location_id,
        created_by,
        due_time,
        start_date,
        end_date,
        day_of_week,
        day_of_month,
        is_active,
      ],
    );
  } catch (error) {
    throw new ApiError(DB_ERROR, "Creating Todo", error, false);
  }
};

export const getTodosModel = async ({ location_id = null } = {}) => {
  try {
    const whereClauses = [];
    const values = [];

    if (location_id) {
      whereClauses.push("t.location_id = ?");
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
