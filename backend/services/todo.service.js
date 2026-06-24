import * as locationModel from "../model/location.model.js";
import * as todoModel from "../model/todo.model.js";
import { ApiError } from "../utils/api.util.js";
import { ADD_ERROR, CUSTOM_ERROR, FETCH_ERROR, NOT_FOUND } from "../utils/message.util.js";
import { isEmpty } from "../utils/misc.util.js";

const normalizeOptionalText = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const normalizeOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return Number(value);
};

const normalizeTodoPayload = (payload, createdBy) => {
  const schedule = payload.schedule;
  const locationIds = payload.location_ids || (payload.location_id ? [payload.location_id] : []);

  return {
    type: payload.type,
    schedule,
    title: payload.title,
    description: normalizeOptionalText(payload.description),
    location_ids: [...new Set(locationIds.map((locationId) => Number(locationId)))],
    created_by: createdBy,
    due_time: normalizeOptionalText(payload.due_time),
    start_date: normalizeOptionalText(payload.start_date),
    end_date: normalizeOptionalText(payload.end_date),
    day_of_week: schedule === "weekly" ? normalizeOptionalNumber(payload.day_of_week) : null,
    day_of_month: schedule === "monthly" ? normalizeOptionalNumber(payload.day_of_month) : null,
    is_active: payload.is_active === false ? 0 : 1,
  };
};

const formatLocation = (location) => ({
  todo_location_id: location.todo_location_id,
  location_id: location.location_id,
  district: location.district,
  godown: location.godown,
  sloc: location.sloc,
  cap: location.cap,
  remark: location.remark,
  created_at: location.created_at,
  updated_at: location.updated_at,
});

const groupLocationsByTodoId = (locations = []) => locations.reduce((acc, location) => {
  const todoId = Number(location.todo_id);
  if (!acc.has(todoId)) acc.set(todoId, []);
  acc.get(todoId).push(formatLocation(location));
  return acc;
}, new Map());

const formatTodo = (todo, locations = []) => {
  const [primaryLocation = null] = locations;

  return {
    todo_id: todo.todo_id,
    type: todo.type,
    schedule: todo.schedule,
    title: todo.title,
    description: todo.description,
    location_id: primaryLocation?.location_id || null,
    location: primaryLocation,
    location_ids: locations.map((location) => location.location_id),
    locations,
    created_by: todo.created_by,
    created_by_user: todo.created_by
      ? {
          user_id: todo.created_by,
          full_name: todo.created_by_name,
          phone_number: todo.created_by_phone_number,
        }
      : null,
    due_time: todo.due_time,
    start_date: todo.start_date,
    end_date: todo.end_date,
    day_of_week: todo.day_of_week,
    day_of_month: todo.day_of_month,
    is_active: Boolean(todo.is_active),
    created_at: todo.created_at,
    updated_at: todo.updated_at,
  };
};

const ensureLocationExists = async (locationId) => {
  const location = await locationModel.getLocationByIdModel(locationId);

  if (isEmpty(location)) {
    throw new ApiError(NOT_FOUND, "Location");
  }

  return location;
};

const ensureLocationsExist = async (locationIds = []) => {
  const uniqueLocationIds = [...new Set(locationIds.map((locationId) => Number(locationId)))];

  const locations = await Promise.all(
    uniqueLocationIds.map((locationId) => ensureLocationExists(locationId)),
  );

  return locations;
};

const ensureTodoExists = async (todoId) => {
  const todo = await todoModel.getTodoByIdModel(todoId);

  if (isEmpty(todo)) {
    throw new ApiError(NOT_FOUND, "Todo");
  }

  return todo;
};

export const createTodoService = async (payload, user) => {
  try {
    const todoPayload = normalizeTodoPayload(payload, user.user_id);
    await ensureLocationsExist(todoPayload.location_ids);

    const result = await todoModel.createTodoModel(todoPayload);

    if (!result?.insertId) {
      throw new ApiError(CUSTOM_ERROR, "Todo was not created");
    }

    const todo = await ensureTodoExists(result.insertId);
    const locations = await todoModel.getTodoLocationsByTodoIdsModel([result.insertId]);
    return formatTodo(todo, locations.map(formatLocation));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(ADD_ERROR, "Todo", error, false);
  }
};

export const getTodosService = async (filters = {}) => {
  try {
    const todos = await todoModel.getTodosModel({
      location_id: filters.location_id ? Number(filters.location_id) : null,
    });
    const locations = await todoModel.getTodoLocationsByTodoIdsModel(
      todos.map((todo) => todo.todo_id),
    );
    const locationsByTodoId = groupLocationsByTodoId(locations);

    return todos.map((todo) => formatTodo(todo, locationsByTodoId.get(Number(todo.todo_id)) || []));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(FETCH_ERROR, "Todos", error, false);
  }
};

export const getTodoByIdService = async (todoId) => {
  try {
    const todo = await ensureTodoExists(todoId);
    const locations = await todoModel.getTodoLocationsByTodoIdsModel([todoId]);
    return formatTodo(todo, locations.map(formatLocation));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(FETCH_ERROR, "Todo", error, false);
  }
};
