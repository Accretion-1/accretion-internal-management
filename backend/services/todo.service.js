import * as locationModel from "../model/location.model.js";
import * as todoModel from "../model/todo.model.js";
import fs from "fs";
import { ApiError } from "../utils/api.util.js";
import {
  ADD_ERROR,
  CUSTOM_ERROR,
  FETCH_ERROR,
  FORBIDDEN,
  INVALID,
  NOT_FOUND,
  REQUIRED,
  UPDATE_ERROR,
} from "../utils/message.util.js";
import { isEmpty } from "../utils/misc.util.js";

const normalizeOptionalText = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value;
};

const normalizeOptionalDate = (value) => {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
    start_date: normalizeOptionalDate(payload.start_date),
    end_date: normalizeOptionalDate(payload.end_date),
    day_of_week: schedule === "weekly" ? normalizeOptionalNumber(payload.day_of_week) : null,
    day_of_month: schedule === "monthly" ? normalizeOptionalNumber(payload.day_of_month) : null,
    is_active: payload.is_active === false ? 0 : 1,
  };
};

const hasOwnValue = (payload, key) => Object.prototype.hasOwnProperty.call(payload, key);

const normalizeUpdateTodoPayload = (payload) => {
  const normalized = {};

  if (hasOwnValue(payload, "title")) {
    normalized.title = payload.title;
  }

  if (hasOwnValue(payload, "description")) {
    normalized.description = normalizeOptionalText(payload.description);
  }

  if (hasOwnValue(payload, "schedule")) {
    normalized.schedule = payload.schedule;
    normalized.day_of_week =
      payload.schedule === "weekly" ? normalizeOptionalNumber(payload.day_of_week) : null;
    normalized.day_of_month =
      payload.schedule === "monthly" ? normalizeOptionalNumber(payload.day_of_month) : null;
  } else {
    if (hasOwnValue(payload, "day_of_week")) {
      normalized.day_of_week = normalizeOptionalNumber(payload.day_of_week);
    }

    if (hasOwnValue(payload, "day_of_month")) {
      normalized.day_of_month = normalizeOptionalNumber(payload.day_of_month);
    }
  }

  if (hasOwnValue(payload, "start_date")) {
    normalized.start_date = normalizeOptionalDate(payload.start_date);
  }

  if (hasOwnValue(payload, "is_active")) {
    normalized.is_active = payload.is_active === false ? 0 : 1;
  }

  if (hasOwnValue(payload, "location_ids") || hasOwnValue(payload, "location_id")) {
    const locationIds = payload.location_ids || (payload.location_id ? [payload.location_id] : []);
    normalized.location_ids = [...new Set(locationIds.map((locationId) => Number(locationId)))];
  }

  return normalized;
};

const formatLocation = (location) => ({
  todo_location_id: location.todo_location_id,
  location_id: location.location_id,
  district: location.district,
  godown: location.godown,
  sloc: location.sloc,
  cap: location.cap,
  remark: location.remark,
  created_at: location.todo_location_created_at || location.created_at,
  updated_at: location.todo_location_updated_at || location.updated_at,
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

const formatUserTodo = (todo) => {
  const location = formatLocation(todo);

  return {
    ...formatTodo(todo, [location]),
    todo_location_id: todo.todo_location_id,
    is_completed: Boolean(todo.is_completed),
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

const ensureUserTodoAccess = (user) => {
  if (user?.role !== "USER") {
    throw new ApiError(FORBIDDEN, "User todo");
  }

  if (!user?.user_id) {
    throw new ApiError(REQUIRED, "User");
  }

  if (!user?.location_id) {
    throw new ApiError(REQUIRED, "User location");
  }
};

const normalizeUserTodoQuery = (query = {}) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);

  return {
    status: query.status || null,
    page,
    limit,
  };
};

const normalizeBoolean = (value) => {
  if (value === true || value === 1 || value === "1" || value === "true") return true;
  if (value === false || value === 0 || value === "0" || value === "false") return false;
  return null;
};

const normalizeCompletionFiles = (files = {}) => {
  const allFiles = [
    ...(files.photos || []),
    ...(files.videos || []),
    ...(files.files || []),
  ];

  return allFiles.map((file) => ({
    originalname: file.originalname,
    mimetype: file.mimetype,
    path: file.path,
    file_type: file.mimetype?.startsWith("video/") ? "video" : "photo",
    file_url: `/public/${file.filename}`,
  }));
};

const cleanupUploadedFiles = (files = []) => {
  files.forEach((file) => {
    if (!file.path) return;
    fs.unlink(file.path, () => {});
  });
};

const buildCompletionPayload = (todo, body = {}, files = {}) => {
  const uploadedFiles = normalizeCompletionFiles(files);
  const remarks = normalizeOptionalText(body.remarks);

  if (todo.type === "stock") {
    const superValue = body.super ?? body.super_stocks;

    if (uploadedFiles.length) {
      throw new ApiError(INVALID, "files for stock todo");
    }

    if (body.ppc === undefined || body.wp === undefined || superValue === undefined) {
      throw new ApiError(REQUIRED, "ppc, wp and super");
    }

    return {
      ppc: Number(body.ppc),
      wp: Number(body.wp),
      super: Number(superValue),
      remarks,
      files: [],
    };
  }

  if (todo.type === "checkbox") {
    const checkboxStatus = normalizeBoolean(body.checkbox_status);

    if (uploadedFiles.length) {
      throw new ApiError(INVALID, "files for checkbox todo");
    }

    if (checkboxStatus === null) {
      throw new ApiError(REQUIRED, "checkbox_status");
    }

    return {
      checkbox_status: checkboxStatus,
      remarks,
      files: [],
    };
  }

  if (todo.type === "photo") {
    const photoFiles = uploadedFiles.filter((file) => file.mimetype?.startsWith("image/"));

    if (!photoFiles.length) {
      throw new ApiError(REQUIRED, "Photo files");
    }

    if (photoFiles.length !== uploadedFiles.length) {
      throw new ApiError(INVALID, "Photo files");
    }

    return {
      remarks,
      files: photoFiles.map(({ file_type, file_url }) => ({ file_type, file_url })),
    };
  }

  if (todo.type === "video") {
    const videoFiles = uploadedFiles.filter((file) => file.mimetype?.startsWith("video/"));

    if (!videoFiles.length) {
      throw new ApiError(REQUIRED, "Video files");
    }

    if (videoFiles.length !== uploadedFiles.length) {
      throw new ApiError(INVALID, "Video files");
    }

    return {
      remarks,
      files: videoFiles.map(({ file_type, file_url }) => ({ file_type, file_url })),
    };
  }

  throw new ApiError(INVALID, "Todo type");
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

export const updateTodoService = async (todoId, payload) => {
  try {
    await ensureTodoExists(todoId);

    const todoPayload = normalizeUpdateTodoPayload(payload);

    if (Array.isArray(todoPayload.location_ids)) {
      await ensureLocationsExist(todoPayload.location_ids);
    }

    await todoModel.updateTodoModel(todoId, todoPayload);

    const todo = await ensureTodoExists(todoId);
    const locations = await todoModel.getTodoLocationsByTodoIdsModel([todoId]);
    return formatTodo(todo, locations.map(formatLocation));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(UPDATE_ERROR, "Todo", error, false);
  }
};

export const getLoggedInUserTodosService = async (query = {}, user) => {
  try {
    ensureUserTodoAccess(user);

    const filters = normalizeUserTodoQuery(query);
    const basePayload = {
      user_id: Number(user.user_id),
      location_id: Number(user.location_id),
      status: filters.status,
    };

    const [todos, totalRecords] = await Promise.all([
      todoModel.getUserEligibleTodosModel({
        ...basePayload,
        page: filters.page,
        limit: filters.limit,
      }),
      todoModel.countUserEligibleTodosModel(basePayload),
    ]);

    return {
      records: todos.map(formatUserTodo),
      total_records: totalRecords,
      total_pages: Math.ceil(totalRecords / filters.limit),
      current_page: filters.page,
      limit: filters.limit,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(FETCH_ERROR, "User Todos", error, false);
  }
};

export const getLoggedInUserTodoByIdService = async (todoId, query = {}, user) => {
  try {
    ensureUserTodoAccess(user);

    const filters = normalizeUserTodoQuery(query);
    const todo = await todoModel.getUserEligibleTodoByIdModel({
      todo_id: Number(todoId),
      user_id: Number(user.user_id),
      location_id: Number(user.location_id),
      status: filters.status,
    });

    if (isEmpty(todo)) {
      throw new ApiError(NOT_FOUND, "Todo");
    }

    return formatUserTodo(todo);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(FETCH_ERROR, "User Todo", error, false);
  }
};

export const completeLoggedInUserTodoService = async (todoId, body = {}, files = {}, user) => {
  const uploadedFiles = normalizeCompletionFiles(files);

  try {
    ensureUserTodoAccess(user);

    const todo = await todoModel.getUserEligibleTodoByIdModel({
      todo_id: Number(todoId),
      user_id: Number(user.user_id),
      location_id: Number(user.location_id),
    });

    if (isEmpty(todo)) {
      throw new ApiError(NOT_FOUND, "Todo");
    }

    if (Boolean(todo.is_completed)) {
      throw new ApiError(CUSTOM_ERROR, "Todo is already completed");
    }

    const completionPayload = buildCompletionPayload(todo, body, files);

    const completion = await todoModel.completeTodoModel({
      todo_id: Number(todo.todo_id),
      todo_location_id: Number(todo.todo_location_id),
      completed_by: Number(user.user_id),
      ...completionPayload,
    });

    return {
      ...completion,
      todo: {
        ...formatUserTodo(todo),
        is_completed: true,
      },
    };
  } catch (error) {
    cleanupUploadedFiles(uploadedFiles);
    if (error instanceof ApiError) throw error;
    throw new ApiError(UPDATE_ERROR, "Todo completion", error, false);
  }
};
