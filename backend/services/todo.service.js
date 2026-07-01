import * as locationModel from "../model/location.model.js";
import * as ocrService from "./ocr.service.js";
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
import { CustomImagePath, isEmpty } from "../utils/misc.util.js";

const STOCK_ITEM_NAMES = ["ppc", "wp", "super", "cnt_ppc", "cnt_wp", "cnt_super"];

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

const formatDateOnly = (value) => normalizeOptionalDate(value);

const normalizeOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return Number(value);
};

const normalizeOptionalBooleanNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
};

const parseJsonValue = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
};

const normalizeStockItems = (value) => {
  const parsedValue = parseJsonValue(value, []);
  const rows = Array.isArray(parsedValue) ? parsedValue : [];

  return rows.flatMap((row, groupIndex) => {
    const week = normalizeOptionalNumber(row?.week ?? groupIndex + 1);

    if (row?.stock_name !== undefined) {
      const stockValue = Number(row.stock_value ?? 0);
      return [{
        stock_name: row.stock_name,
        stock_value: stockValue,
        week: stockValue > 0 ? week : null,
      }];
    }

    return STOCK_ITEM_NAMES.map((stockName) => ({
      stock_name: stockName,
      stock_value: Number(row?.[stockName] ?? 0),
      week: Number(row?.[stockName] ?? 0) > 0 ? week : null,
    }));
  });
};

const normalizeLegacyStockItems = (body = {}) => {
  if (body.stock_items !== undefined) {
    return normalizeStockItems(body.stock_items);
  }

  return STOCK_ITEM_NAMES.map((stockName) => {
    const sourceKey = stockName === "super" ? "super_stocks" : stockName;
    const stockValue = Number(body[sourceKey] ?? body[stockName] ?? 0);
    return {
      stock_name: stockName,
      stock_value: stockValue,
      week: stockValue > 0 ? normalizeOptionalNumber(body.week ?? 1) : null,
    };
  });
};

const normalizeCheckboxItems = (value) => {
  const parsedValue = parseJsonValue(value, []);
  if (!Array.isArray(parsedValue)) return [];

  return parsedValue
    .map((item, index) => {
      const label = typeof item === "string" ? item : item?.label;
      const trimmedLabel = String(label || "").trim();
      if (!trimmedLabel) return null;

      return {
        key: String(item?.key || `checkbox_${index + 1}`),
        label: trimmedLabel,
      };
    })
    .filter(Boolean);
};

const normalizeCheckboxItemsForDb = (value) => {
  const items = normalizeCheckboxItems(value);
  return items.length ? JSON.stringify(items) : null;
};

const normalizeCheckboxResponseForDb = (value, checkboxItems = []) => {
  const parsedValue = parseJsonValue(value, []);
  if (!Array.isArray(parsedValue)) return null;

  const itemMap = new Map(
    checkboxItems.map((item, index) => [String(item.key || `checkbox_${index + 1}`), item.label]),
  );

  const responses = parsedValue
    .map((item, index) => {
      const key = String(item?.key || `checkbox_${index + 1}`);
      const label = String(item?.label || itemMap.get(key) || "").trim();
      if (!label) return null;

      return {
        key,
        label,
        response: Boolean(item?.response),
      };
    })
    .filter(Boolean);

  return responses.length ? JSON.stringify(responses) : null;
};

const normalizeTodoPayload = (payload, createdBy) => {
  const schedule = payload.schedule;
  const locationIds = payload.location_ids || (payload.location_id ? [payload.location_id] : []);

  return {
    type: payload.type,
    schedule,
    is_ocr: payload.type === "photo" ? normalizeOptionalBooleanNumber(payload.is_ocr) : null,
    title: payload.title,
    description: normalizeOptionalText(payload.description),
    checkbox_items: payload.type === "checkbox"
      ? normalizeCheckboxItemsForDb(payload.checkbox_items)
      : null,
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

  if (hasOwnValue(payload, "checkbox_items")) {
    normalized.checkbox_items = normalizeCheckboxItemsForDb(payload.checkbox_items);
  }

  if (hasOwnValue(payload, "is_ocr")) {
    normalized.is_ocr = normalizeOptionalBooleanNumber(payload.is_ocr);
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
    is_ocr: todo.is_ocr === null || todo.is_ocr === undefined ? null : Boolean(todo.is_ocr),
    title: todo.title,
    description: todo.description,
    checkbox_items: parseJsonValue(todo.checkbox_items, []),
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
    start_date: formatDateOnly(todo.start_date),
    end_date: formatDateOnly(todo.end_date),
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

const ensureAdminOrManagerAccess = (user) => {
  if (!["ADMIN", "MANAGER"].includes(user?.role)) {
    throw new ApiError(FORBIDDEN, "Todo completions");
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

const normalizePaginationQuery = (query = {}) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);

  return {
    page,
    limit,
  };
};

const groupFilesByCompletionId = (files = []) => files.reduce((acc, file) => {
  const completionId = Number(file.completion_id);
  if (!acc.has(completionId)) acc.set(completionId, []);
  acc.get(completionId).push(file);
  return acc;
}, new Map());

const groupCompletionItemsByCompletionId = (items = []) => items.reduce((acc, item) => {
  const completionId = Number(item.completion_id);
  if (!acc.has(completionId)) acc.set(completionId, []);
  acc.get(completionId).push({
    todo_completion_item_id: item.todo_completion_item_id,
    stock_name: item.stock_name,
    stock_value: Number(item.stock_value || 0),
    week: item.week === null || item.week === undefined ? null : Number(item.week),
    created_at: item.created_at,
  });
  return acc;
}, new Map());

const buildStockItemGroups = (items = []) => {
  const groups = new Map();

  items.forEach((item) => {
    const weekKey = item.week === null || item.week === undefined ? "default" : String(item.week);
    if (!groups.has(weekKey)) {
      groups.set(weekKey, {
        week: item.week,
        ppc: 0,
        wp: 0,
        super: 0,
        cnt_ppc: 0,
        cnt_wp: 0,
        cnt_super: 0,
      });
    }

    groups.get(weekKey)[item.stock_name] = Number(item.stock_value || 0);
  });

  return [...groups.values()];
};

const buildStockItemSections = (items = []) => STOCK_ITEM_NAMES.map((stockName) => ({
  stock_name: stockName,
  items: items
    .filter((item) => item.stock_name === stockName)
    .map((item) => ({
      todo_completion_item_id: item.todo_completion_item_id,
      week: item.week,
      stock_value: Number(item.stock_value || 0),
      created_at: item.created_at,
    })),
})).filter((section) => section.items.length);

const getStoredFileName = (fileUrl) => {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  return String(fileUrl).split("/").filter(Boolean).pop();
};

const formatCompletionFile = (file) => ({
  ...file,
  file_name: getStoredFileName(file.file_url),
  file_url: CustomImagePath(getStoredFileName(file.file_url)),
});

const formatTodoCompletion = (completion, files = [], stockItems = []) => {
  const stockItemGroups = buildStockItemGroups(stockItems);
  const stockItemSections = buildStockItemSections(stockItems);
  const [firstStockGroup = {}] = stockItemGroups;

  return {
    completion_id: completion.completion_id,
    todo_id: completion.todo_id,
    todo_location_id: completion.todo_location_id,
    completed_by: completion.completed_by,
    completed_by_user: completion.completed_by
      ? {
          user_id: completion.completed_by,
          full_name: completion.completed_by_name,
          phone_number: completion.completed_by_phone_number,
        }
      : null,
    completion_date: formatDateOnly(completion.completion_date),
    ppc: firstStockGroup.ppc,
    wp: firstStockGroup.wp,
    super: firstStockGroup.super,
    cnt_ppc: firstStockGroup.cnt_ppc,
    cnt_wp: firstStockGroup.cnt_wp,
    cnt_super: firstStockGroup.cnt_super,
    week: firstStockGroup.week,
    stock_items: stockItems,
    stock_item_groups: stockItemGroups,
    stock_item_sections: stockItemSections,
    checkbox_items_response: parseJsonValue(completion.checkbox_items_response, []),
    remarks: completion.remarks,
    completed_at: completion.completed_at,
    updated_at: completion.updated_at,
    location: {
      location_id: completion.location_id,
      district: completion.district,
      godown: completion.godown,
      sloc: completion.sloc,
      cap: completion.cap,
      remark: completion.location_remark,
    },
    files: files.map(formatCompletionFile),
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
    file_url: file.filename,
  }));
};

const cleanupUploadedFiles = (files = []) => {
  files.forEach((file) => {
    if (!file.path) return;
    fs.unlink(file.path, () => {});
  });
};

const verifyPhotoFilesWithOcr = async (photoFiles = []) => {
  for (const file of photoFiles) {
    const buffer = await fs.promises.readFile(file.path);
    const result = await ocrService.verifyOcrImageService({
      buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    if (!result?.is_matched) {
      throw new ApiError(CUSTOM_ERROR, `OCR verification failed for ${file.originalname}`);
    }
  }
};

const buildCompletionPayload = async (todo, body = {}, files = {}) => {
  const uploadedFiles = normalizeCompletionFiles(files);
  const remarks = normalizeOptionalText(body.remarks);

  if (todo.type === "stock") {
    const stockItems = normalizeLegacyStockItems(body);

    if (uploadedFiles.length) {
      throw new ApiError(INVALID, "files for stock todo");
    }

    if (!stockItems.length) {
      throw new ApiError(REQUIRED, "stock_items");
    }

    return {
      stock_items: stockItems,
      remarks,
      files: [],
    };
  }

  if (todo.type === "checkbox") {
    if (uploadedFiles.length) {
      throw new ApiError(INVALID, "files for checkbox todo");
    }

    const checkboxItems = normalizeCheckboxItems(todo.checkbox_items);
    const checkboxItemsResponse = normalizeCheckboxResponseForDb(
      body.checkbox_items_response,
      checkboxItems,
    );

    if (!checkboxItems.length) {
      throw new ApiError(REQUIRED, "checkbox_items");
    }

    if (!checkboxItemsResponse) {
      throw new ApiError(REQUIRED, "checkbox_items_response");
    }

    return {
      checkbox_items_response: checkboxItemsResponse,
      remarks,
      files: [],
    };
  }

  if (todo.type === "photo") {
    const photoFiles = uploadedFiles.filter((file) => file.mimetype?.startsWith("image/"));

    if (!photoFiles.length && !remarks) {
      throw new ApiError(REQUIRED, "Photo files or remarks");
    }

    if (photoFiles.length !== uploadedFiles.length) {
      throw new ApiError(INVALID, "Photo files");
    }

    if (Boolean(todo.is_ocr) && photoFiles.length) {
      await verifyPhotoFilesWithOcr(photoFiles);
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
    const existingTodo = await ensureTodoExists(todoId);

    const todoPayload = normalizeUpdateTodoPayload(payload);

    if (existingTodo.type === "photo" && hasOwnValue(todoPayload, "is_ocr") && todoPayload.is_ocr === null) {
      throw new ApiError(REQUIRED, "is_ocr");
    }

    if (existingTodo.type !== "photo" && hasOwnValue(todoPayload, "is_ocr")) {
      todoPayload.is_ocr = null;
    }

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

    const completionPayload = await buildCompletionPayload(todo, body, files);

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

export const getTodoCompletionsService = async (todoId, query = {}, user) => {
  try {
    ensureAdminOrManagerAccess(user);
    await ensureTodoExists(todoId);

    const { page, limit } = normalizePaginationQuery(query);
    const basePayload = {
      todo_id: Number(todoId),
      location_id: query.location_id ? Number(query.location_id) : null,
    };

    const [completions, totalRecords] = await Promise.all([
      todoModel.getTodoCompletionsModel({
        ...basePayload,
        page,
        limit,
      }),
      todoModel.countTodoCompletionsModel(basePayload),
    ]);

    const completionIds = completions.map((completion) => completion.completion_id);
    const [files, stockItems] = await Promise.all([
      todoModel.getCompletionFilesByCompletionIdsModel(completionIds),
      todoModel.getCompletionItemsByCompletionIdsModel(completionIds),
    ]);
    const filesByCompletionId = groupFilesByCompletionId(files);
    const stockItemsByCompletionId = groupCompletionItemsByCompletionId(stockItems);

    return {
      records: completions.map((completion) =>
        formatTodoCompletion(
          completion,
          filesByCompletionId.get(Number(completion.completion_id)) || [],
          stockItemsByCompletionId.get(Number(completion.completion_id)) || [],
        ),
      ),
      total_records: totalRecords,
      total_pages: Math.ceil(totalRecords / limit),
      current_page: page,
      limit,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(FETCH_ERROR, "Todo Completions", error, false);
  }
};

export const getAdminManagerTodayTodosService = async (query = {}, user) => {
  try {
    ensureAdminOrManagerAccess(user);

    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const locationId = query.location_id ? Number(query.location_id) : null;
    const status = query.status || null;

    const [records, totalRecords, totalCount, completedCount, activeCount] = await Promise.all([
      todoModel.getAdminManagerTodayTodosModel({
        location_id: locationId,
        status,
        page,
        limit,
      }),
      todoModel.countAdminManagerTodayTodosModel({
        location_id: locationId,
        status,
      }),
      todoModel.countAdminManagerTodayTodosModel({
        location_id: locationId,
        status: null,
      }),
      todoModel.countAdminManagerTodayTodosModel({
        location_id: locationId,
        status: 'completed',
      }),
      todoModel.countAdminManagerTodayTodosModel({
        location_id: locationId,
        status: 'active',
      }),
    ]);

    const completionIds = records
      .map((r) => r.completion_id)
      .filter(Boolean);

    let filesByCompletionId = new Map();
    let stockItemsByCompletionId = new Map();
    if (completionIds.length) {
      const [files, stockItems] = await Promise.all([
        todoModel.getCompletionFilesByCompletionIdsModel(completionIds),
        todoModel.getCompletionItemsByCompletionIdsModel(completionIds),
      ]);
      filesByCompletionId = groupFilesByCompletionId(files);
      stockItemsByCompletionId = groupCompletionItemsByCompletionId(stockItems);
    }

    const formattedRecords = records.map((record) => {
      const location = {
        todo_location_id: record.todo_location_id,
        location_id: record.location_id,
        district: record.district,
        godown: record.godown,
        sloc: record.sloc,
        cap: record.cap,
        remark: record.location_remark,
      };

      const baseTodo = {
        todo_id: record.todo_id,
        type: record.type,
        schedule: record.schedule,
        is_ocr: record.is_ocr === null || record.is_ocr === undefined ? null : Boolean(record.is_ocr),
        title: record.title,
        description: record.description,
        checkbox_items: parseJsonValue(record.checkbox_items, []),
        location_id: record.location_id,
        location,
        location_ids: [record.location_id],
        locations: [location],
        created_by: record.created_by,
        created_by_user: record.created_by
          ? {
              user_id: record.created_by,
              full_name: record.created_by_name,
              phone_number: record.created_by_phone_number,
            }
          : null,
        due_time: record.due_time,
        start_date: formatDateOnly(record.start_date),
        end_date: formatDateOnly(record.end_date),
        day_of_week: record.day_of_week,
        day_of_month: record.day_of_month,
        is_active: Boolean(record.is_active),
        created_at: record.created_at,
        updated_at: record.updated_at,
      };

      const completion = record.completion_id
        ? {
            completion_id: record.completion_id,
            todo_id: record.todo_id,
            todo_location_id: record.todo_location_id,
            completed_by: record.completed_by,
            completed_by_user: record.completed_by
              ? {
                  user_id: record.completed_by,
                  full_name: record.completed_by_name,
                  phone_number: record.completed_by_phone_number,
                }
              : null,
            completion_date: formatDateOnly(record.completion_date),
            completed_at: record.completed_at,
            ...(() => {
              const stockItems = stockItemsByCompletionId.get(Number(record.completion_id)) || [];
              const stockItemGroups = buildStockItemGroups(stockItems);
              const stockItemSections = buildStockItemSections(stockItems);
              const [firstStockGroup = {}] = stockItemGroups;
              return {
                ppc: firstStockGroup.ppc,
                wp: firstStockGroup.wp,
                super: firstStockGroup.super,
                cnt_ppc: firstStockGroup.cnt_ppc,
                cnt_wp: firstStockGroup.cnt_wp,
                cnt_super: firstStockGroup.cnt_super,
                week: firstStockGroup.week,
                stock_items: stockItems,
                stock_item_groups: stockItemGroups,
                stock_item_sections: stockItemSections,
              };
            })(),
            checkbox_items_response: parseJsonValue(record.checkbox_items_response, []),
            remarks: record.remarks,
            files: (filesByCompletionId.get(Number(record.completion_id)) || []).map(formatCompletionFile),
          }
        : null;

      return {
        ...baseTodo,
        todo_location_id: record.todo_location_id,
        is_completed: Boolean(record.is_completed),
        completion,
      };
    });

    return {
      records: formattedRecords,
      total_records: totalRecords,
      total_pages: Math.ceil(totalRecords / limit),
      current_page: page,
      limit,
      stats: {
        total: totalCount,
        completed: completedCount,
        pending: activeCount,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(FETCH_ERROR, "Today's Todos", error, false);
  }
};
