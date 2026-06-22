import Joi from 'joi';

export const emailValidation = Joi.string().trim().required().email();
export const stringValidation = Joi.string().trim().required();
export const idArrayValidation = Joi.array().items(stringValidation).optional();
export const numberValidation = Joi.number().required();
export const booleanValidation = Joi.boolean().required();
export const dateValidation = Joi.date().required();
export const arrayObjectValidation = Joi.array()
  .required()
  .items(Joi.object({}).unknown());
export const urlValidation = Joi.string().trim().required().uri();
export const genderValidation = Joi.string().valid('MALE', 'FEMALE', 'OTHER').required();
export const passwordValidation = Joi.string()
  .min(8)
  .max(64)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&^+=])[A-Za-z\d@$!%*?#&^+=]{8,}$/)
  .message(
    "Password must be 8-64 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character."
  );

export const messages = {
  'date.base': ':key must be a valid date',
  'date.empty': ':key is required',
  'date.format': ':key must be a valid date',
  'string.base': ':key must be a string',
  'string.email': 'Please enter a valid email',
  'string.uri': 'Please enter a valid URL',
  'string.empty': ':key is required',
  'number.base': ':key must be a number',
  'number.integer': ':key must be a valid number',
  'number.empty': ':key is required',
  'number.unsafe': ':key must be valid',
  'boolean.base': ':key must be true/false',
  'any.required': ':key is required',
  'any.invalid': ':key is invalid',
  'any.only': ':value is not a valid :key',
  'object.unknown': ':key is not allowed',
  'array.base': ':key must be an array',
  'array.includesRequiredUnknowns': ':key connot be empty',
};

export const populateMessage = (error) => {
  const errorDetails = error?.details?.[0];

  if (!errorDetails) return 'Validation error';

  let message = messages[errorDetails.type] || errorDetails.message || 'Validation error';

  const key =
    errorDetails.context?.key === 0
      ? errorDetails.context.label
      : errorDetails.context?.key || 'Field';

  let value = errorDetails.context?.value || '';
  if (value && typeof value === 'object') {
    try {
      value = JSON.stringify(value);
    } catch (e) {
      value = '[object]';
    }
  }

  message = message.replace(/:key/g, key).replace(/:value/g, value);

  return message;
};
