import Joi from "joi";
import { messages } from "../utils/validator.util.js";

const todoTypes = ["stock", "photo", "video", "checkbox"];
const todoSchedules = ["daily", "weekly", "monthly", "single"];

const nullableTextValidation = Joi.string().trim().allow("", null);
const dateValidation = Joi.string().trim().pattern(/^\d{4}-\d{2}-\d{2}$/);
const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const startDateValidation = dateValidation.custom((value, helpers) => {
  if (value < getTodayDateValue()) {
    return helpers.message("start_date cannot be a previous date");
  }

  return value;
});
const dueTimeValidation = Joi.string()
  .trim()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  .message("due_time must be in HH:mm or HH:mm:ss format");

const checkboxItemsValidation = Joi.array()
  .items(
    Joi.object({
      key: Joi.string().trim().max(100).optional(),
      label: Joi.string().trim().min(1).max(255).required(),
    }),
  )
  .min(1);

const checkboxItemsResponseValidation = Joi.alternatives().try(
  Joi.array()
    .items(
      Joi.object({
        key: Joi.string().trim().max(100).required(),
        label: Joi.string().trim().min(1).max(255).required(),
        response: Joi.boolean().required(),
      }),
    )
    .min(1),
  Joi.string().custom((value, helpers) => {
    try {
      const parsedValue = JSON.parse(value);
      if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
        return helpers.message("checkbox_items_response must contain at least one item");
      }
      return value;
    } catch {
      return helpers.message("checkbox_items_response must be valid JSON");
    }
  }),
);

const stockItemNames = [
  "ppc",
  "wp",
  "super",
  "cnt_ppc",
  "cnt_wp",
  "cnt_super",
  "damage_ppc",
  "damage_wp",
  "damage_super",
];

const stockItemsValidation = Joi.alternatives().try(
  Joi.array()
    .items(
      Joi.alternatives().try(
        Joi.object({
          stock_name: Joi.string().valid(...stockItemNames).required(),
          stock_value: Joi.number().precision(2).min(0).required(),
          week: Joi.when("stock_value", {
            is: 0,
            then: Joi.number().integer().min(0).allow(null).optional(),
            otherwise: Joi.number().integer().positive().required(),
          }),
        }),
        Joi.object({
          week: Joi.number().integer().positive().required(),
          ppc: Joi.number().precision(2).min(0).required(),
          wp: Joi.number().precision(2).min(0).required(),
          super: Joi.number().precision(2).min(0).required(),
          cnt_ppc: Joi.number().precision(2).min(0).required(),
          cnt_wp: Joi.number().precision(2).min(0).required(),
          cnt_super: Joi.number().precision(2).min(0).required(),
          damage_ppc: Joi.number().precision(2).min(0).required(),
          damage_wp: Joi.number().precision(2).min(0).required(),
          damage_super: Joi.number().precision(2).min(0).required(),
        }),
      ),
    )
    .min(1),
  Joi.string().custom((value, helpers) => {
    try {
      const parsedValue = JSON.parse(value);
      if (!Array.isArray(parsedValue) || parsedValue.length === 0) {
        return helpers.message("stock_items must contain at least one item");
      }

      const hasInvalidItem = parsedValue.some((item) => {
        if (!item) {
          return true;
        }

        if (item.stock_name !== undefined) {
          const stockValue = Number(item.stock_value);
          const weekValue = item.week === null || item.week === undefined || item.week === "" ? null : Number(item.week);

          return !stockItemNames.includes(item.stock_name)
            || Number.isNaN(stockValue)
            || stockValue < 0
            || (stockValue > 0 && (!Number.isInteger(weekValue) || weekValue <= 0))
            || (stockValue === 0 && weekValue !== null && (!Number.isInteger(weekValue) || weekValue < 0));
        }

        if (!Number.isInteger(Number(item.week)) || Number(item.week) <= 0) {
          return true;
        }

        return stockItemNames.some((stockName) =>
          Number.isNaN(Number(item[stockName])) || Number(item[stockName]) < 0,
        );
      });

      if (hasInvalidItem) {
        return helpers.message("stock_items contains invalid values");
      }

      return value;
    } catch {
      return helpers.message("stock_items must be valid JSON");
    }
  }),
);

export const todoIdParamSchema = Joi.object({
  todo_id: Joi.number().integer().positive().required(),
}).messages(messages);

export const getTodosQuerySchema = Joi.object({
  location_id: Joi.number().integer().positive().optional(),
}).messages(messages);

export const getUserTodosQuerySchema = Joi.object({
  status: Joi.string().valid("active", "completed").optional(),
  page: Joi.number().integer().positive().default(1).optional(),
  limit: Joi.number().integer().positive().max(100).default(10).optional(),
}).messages(messages);

export const getTodoCompletionsQuerySchema = Joi.object({
  location_id: Joi.number().integer().positive().optional(),
  date: dateValidation.optional(),
  page: Joi.number().integer().positive().default(1).optional(),
  limit: Joi.number().integer().positive().max(100).default(10).optional(),
}).messages(messages);

export const getAdminManagerTodayTodosQuerySchema = Joi.object({
  location_id: Joi.number().integer().positive().optional(),
  todo_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid("active", "completed").optional(),
  page: Joi.number().integer().positive().default(1).optional(),
  limit: Joi.number().integer().positive().max(100).default(10).optional(),
}).messages(messages);

export const getStockCompletionReportQuerySchema = Joi.object({
  location_id: Joi.number().integer().positive().optional(),
  location_ids: Joi.alternatives().try(
    Joi.string().trim().valid("all"),
    Joi.string().trim().pattern(/^\d+(,\d+)*$/),
    Joi.array().items(Joi.number().integer().positive()).min(1),
  ).optional(),
  todo_id: Joi.number().integer().positive().required(),
  start_date: dateValidation.required(),
  end_date: dateValidation.required(),
  page: Joi.number().integer().positive().default(1).optional(),
  limit: Joi.number().integer().positive().max(100).default(20).optional(),
})
  .or("location_id", "location_ids")
  .custom((value, helpers) => {
    if (value.start_date > value.end_date) {
      return helpers.message("start_date cannot be greater than end_date");
    }

    return value;
  }).messages(messages);


export const createTodoSchema = Joi.object({
  type: Joi.string().valid(...todoTypes).required(),
  schedule: Joi.string().valid(...todoSchedules).required(),
  is_ocr: Joi.when("type", {
    is: "photo",
    then: Joi.boolean().required(),
    otherwise: Joi.valid(null).optional(),
  }),
  title: Joi.string().trim().min(2).max(255).required(),
  description: nullableTextValidation.optional(),
  checkbox_items: Joi.when("type", {
    is: "checkbox",
    then: checkboxItemsValidation.required(),
    otherwise: Joi.valid(null).optional(),
  }),
  location_id: Joi.number().integer().positive().optional(),
  location_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .unique()
    .optional(),
  due_time: dueTimeValidation.required(),
  start_date: startDateValidation.required(),
  day_of_week: Joi.when("schedule", {
    is: "weekly",
    then: Joi.number().integer().min(1).max(7).required(),
    otherwise: Joi.valid(null).optional(),
  }),
  day_of_month: Joi.when("schedule", {
    is: "monthly",
    then: Joi.number().integer().min(1).max(31).required(),
    otherwise: Joi.valid(null).optional(),
  }),
  is_active: Joi.boolean().optional(),
})
  .or("location_id", "location_ids")
  .messages(messages);

export const updateTodoSchema = Joi.object({
  title: Joi.string().trim().min(2).max(255).optional(),
  description: nullableTextValidation.optional(),
  checkbox_items: checkboxItemsValidation.optional(),
  is_ocr: Joi.boolean().allow(null).optional(),
  schedule: Joi.string().valid(...todoSchedules).optional(),
  location_id: Joi.number().integer().positive().optional(),
  location_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .unique()
    .optional(),
  start_date: startDateValidation.optional(),
  day_of_week: Joi.when("schedule", {
    is: "weekly",
    then: Joi.number().integer().min(1).max(7).required(),
    otherwise: Joi.number().integer().min(1).max(7).allow(null).optional(),
  }),
  day_of_month: Joi.when("schedule", {
    is: "monthly",
    then: Joi.number().integer().min(1).max(31).required(),
    otherwise: Joi.number().integer().min(1).max(31).allow(null).optional(),
  }),
  is_active: Joi.boolean().optional(),
})
  .or(
    "title",
    "description",
    "checkbox_items",
    "is_ocr",
    "schedule",
    "location_id",
    "location_ids",
    "start_date",
    "day_of_week",
    "day_of_month",
    "is_active",
  )
  .messages(messages);

export const completeTodoSchema = Joi.object({
  stock_items: stockItemsValidation.optional(),
  ppc: Joi.number().precision(2).min(0).optional(),
  wp: Joi.number().precision(2).min(0).optional(),
  super: Joi.number().precision(2).min(0).optional(),
  super_stocks: Joi.number().precision(2).min(0).optional(),
  cnt_ppc: Joi.number().precision(2).min(0).optional(),
  cnt_wp: Joi.number().precision(2).min(0).optional(),
  cnt_super: Joi.number().precision(2).min(0).optional(),
  damage_ppc: Joi.number().precision(2).min(0).optional(),
  damage_wp: Joi.number().precision(2).min(0).optional(),
  damage_super: Joi.number().precision(2).min(0).optional(),
  week: Joi.string().trim().allow("", null).optional(),
  checkbox_items_response: checkboxItemsResponseValidation.optional(),
  remarks: nullableTextValidation.optional(),
}).messages(messages);
