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
  start_date: dateValidation
    .custom((value, helpers) => {
      const selectedDate = new Date(value);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < todayStart()) {
        return helpers.message("start_date cannot be a previous date");
      }

      return value;
    })
    .required(),
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
