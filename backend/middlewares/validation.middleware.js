import { apiError } from '../utils/api.util.js';
import { CUSTOM_ERROR } from '../utils/message.util.js';
import { populateMessage } from '../utils/validator.util.js';

export const validate = (schema, type) => (req, res, next) => {
  if (req[type] === undefined) {
    req[type] = {};
  }

  const { error } = schema.validate(req[type]);

  if (error) {
    return apiError(CUSTOM_ERROR, populateMessage(error), null, res);
  }

  next();
};

export const validateMultiple = (schema, types) => (req, res, next) => {
  const validationData = {};
  types.forEach((type) => {
    validationData[type] = req[type];
  });

  const { error } = schema.validate(validationData);
  if (error) {
    return apiError(CUSTOM_ERROR, populateMessage(error), null, res);
  }
  next();
};
