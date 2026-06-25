import Joi from "joi";
import { messages } from "../utils/validator.util.js";

const todoTypes = ["stock", "photo", "video", "checkbox"];
const todoSchedules = ["daily", "weekly", "monthly", "single"];

const nullableTextValidation = Joi.string().trim().allow("", null);
const dateValidation = Joi.date().iso();
const todayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};
const startDateValidation = dateValidation.custom((value, helpers) => {
  const selectedDate = new Date(value);
  selectedDate.setHours(0, 0, 0, 0);

  if (selectedDate < todayStart()) {
    return helpers.message("start_date cannot be a previous date");
  }

  return value;
});
const dueTimeValidation = Joi.string()
  .trim()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  .message("due_time must be in HH:mm or HH:mm:ss format");

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

export const createTodoSchema = Joi.object({
  type: Joi.string().valid(...todoTypes).required(),
  schedule: Joi.string().valid(...todoSchedules).required(),
  title: Joi.string().trim().min(2).max(255).required(),
  description: nullableTextValidation.optional(),
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
  checkbox_status: Joi.boolean().optional(),
  remarks: nullableTextValidation.optional(),
}).messages(messages);
