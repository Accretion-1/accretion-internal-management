import Joi from "joi";

const phoneNumber = Joi.string()
  .trim()
  .pattern(/^\+?[1-9]\d{7,14}$/)
  .required()
  .messages({
    "string.pattern.base": "Please enter a valid phone_number with country code",
  });

export const loginUserSchema = Joi.object({
  phone_number: phoneNumber,
  fcm_token: Joi.string().trim().allow("").optional(),
});

export const verifyOTPSchema = Joi.object({
  phone_number: phoneNumber,
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
