import Joi from "joi";
import { messages } from "../utils/validator.util.js";

const nullableTextValidation = Joi.string().trim().allow("", null);
const nullableDateValidation = Joi.date().iso().allow(null);
const nullableIntegerValidation = Joi.number().integer().min(0).allow(null);
const nullableDecimalValidation = Joi.number().min(0).max(100).allow(null);

export const godownSlipIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
}).messages(messages);

export const reviewGodownSlipSchema = Joi.object({
  slip_number: nullableTextValidation.optional(),
  slip_date: nullableDateValidation.optional(),
  godown_name: nullableTextValidation.optional(),
  cement_type: Joi.string().valid("PPC", "WPC", "SUPER", "UNKNOWN").allow(null).optional(),
  bag_count: nullableIntegerValidation.optional(),
  block_number: nullableTextValidation.optional(),
  vehicle_number: nullableTextValidation.optional(),
  dispatch_number: nullableTextValidation.optional(),
  customer_name: nullableTextValidation.optional(),
  destination: nullableTextValidation.optional(),
  material_load_type: nullableTextValidation.optional(),
  validity_date: nullableDateValidation.optional(),
  ocr_confidence: nullableDecimalValidation.optional(),
  status: Joi.string().valid("review", "verified", "rejected").required(),
  remarks: nullableTextValidation.optional(),
})
  .or(
    "slip_number",
    "slip_date",
    "godown_name",
    "cement_type",
    "bag_count",
    "block_number",
    "vehicle_number",
    "dispatch_number",
    "customer_name",
    "destination",
    "material_load_type",
    "validity_date",
    "ocr_confidence",
    "status",
    "remarks",
  )
  .messages(messages);
