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
  page: Joi.number().integer().positive().default(1).optional(),
  limit: Joi.number().integer().positive().max(100).default(10).optional(),
}).messages(messages);

export const getAdminManagerTodayTodosQuerySchema = Joi.object({
  location_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid("active", "completed").optional(),
  page: Joi.number().integer().positive().default(1).optional(),
  limit: Joi.number().integer().positive().max(100).default(10).optional(),
}).messages(messages);


export const createTodoSchema = Joi.object({
  type: Joi.string().valid(...todoTypes).required(),
  schedule: Joi.string().valid(...todoSchedules).required(),
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
  ppc: Joi.number().integer().min(0).optional(),
  wp: Joi.number().integer().min(0).optional(),
  super: Joi.number().integer().min(0).optional(),
  super_stocks: Joi.number().integer().min(0).optional(),
  checkbox_items_response: checkboxItemsResponseValidation.optional(),
  remarks: nullableTextValidation.optional(),
}).messages(messages);
