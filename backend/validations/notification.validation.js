import Joi from "joi";

export const sendNotificationSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  title: Joi.string().trim().min(1).max(120).required(),
  body: Joi.string().trim().min(1).max(500).required(),
  data: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
});
