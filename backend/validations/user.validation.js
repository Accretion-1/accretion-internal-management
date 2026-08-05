import Joi from "joi";

const phoneNumber = Joi.string()
  .trim()
  .pattern(/^\+?[1-9]\d{7,14}$/)
  .required()
  .messages({
    "string.pattern.base": "Please enter a valid phone_number with country code",
  });

const optionalPhoneNumber = Joi.string()
  .trim()
  .pattern(/^\+?[1-9]\d{7,14}$/)
  .messages({
    "string.pattern.base": "Please enter a valid phone_number with country code",
  });

export const loginUserSchema = Joi.object({
  phone_number: phoneNumber,
});

export const verifyOTPSchema = Joi.object({
  phone_number: phoneNumber,
  fcm_token: Joi.string().trim().allow("", null).optional(),
  otp: Joi.alternatives()
    .try(
      Joi.string().trim().pattern(/^\d{4}$/),
      Joi.number().integer().min(1000).max(9999),
    )
    .required()
    .messages({ "alternatives.match": "otp must be a 4-digit code" }),
});

export const resendOTPSchema = Joi.object({
  phone_number: phoneNumber,
});

export const createUserSchema = Joi.object({
  phone_number: phoneNumber,
  role: Joi.string().valid("USER", "ADMIN", "MANAGER").required(),
  location_id: Joi.when("role", {
    is: "USER",
    then: Joi.number().integer().positive().required(),
    otherwise: Joi.number().integer().positive().allow(null).optional().default(null),
  }),
  panel_ids: Joi.when("role", {
    is: "USER",
    then: Joi.array().items(Joi.number().integer().positive()).min(1).unique().required(),
    otherwise: Joi.array().items(Joi.number().integer().positive()).unique().optional().default([]),
  }),
  full_name: Joi.string().trim().allow("", null).optional(),
  email: Joi.string().trim().email().allow("", null).optional(),
  gender: Joi.string().valid("MALE", "FEMALE", "OTHER").allow(null).optional(),
  profile_image: Joi.string().trim().allow("", null).optional(),
  is_active: Joi.boolean().optional(),
});

export const userIdParamSchema = Joi.object({
  user_id: Joi.number().integer().positive().required(),
});

export const updateUserSchema = Joi.object({
  phone_number: optionalPhoneNumber.optional(),
  location_id: Joi.number().integer().positive().allow(null).optional(),
  panel_ids: Joi.array().items(Joi.number().integer().positive()).unique().optional(),
  full_name: Joi.string().trim().allow("", null).optional(),
  is_active: Joi.boolean().optional(),
})
  .or("phone_number", "location_id", "panel_ids", "full_name", "is_active")
  .unknown(false);

export const updateFcmTokenSchema = Joi.object({
  fcm_token: Joi.string().trim().allow("", null).required(),
});
