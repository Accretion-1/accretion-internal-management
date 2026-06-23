import Joi from "joi";
import { messages } from "../utils/validator.util.js";

const nullableTextValidation = Joi.string().trim().allow("", null);
const nullableIntegerValidation = Joi.number().integer().min(0).allow(null);

export const locationIdParamSchema = Joi.object({
  location_id: Joi.number().integer().positive().required(),
}).messages(messages);

export const createLocationSchema = Joi.object({
  district: nullableTextValidation.optional(),
  godown: nullableTextValidation.optional(),
  sloc: nullableIntegerValidation.optional(),
  cap: nullableIntegerValidation.optional(),
  remark: nullableTextValidation.optional(),
})
  .or("district", "godown", "sloc", "cap", "remark")
  .messages(messages);

export const updateLocationSchema = Joi.object({
  district: nullableTextValidation.optional(),
  godown: nullableTextValidation.optional(),
  sloc: nullableIntegerValidation.optional(),
  cap: nullableIntegerValidation.optional(),
  remark: nullableTextValidation.optional(),
})
  .or("district", "godown", "sloc", "cap", "remark")
  .messages(messages);
