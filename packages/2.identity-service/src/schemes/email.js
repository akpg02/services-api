const Joi = require('joi');

const emailSchema = (data) => {
  const scheme = Joi.object({
    email: Joi.string().email().required().messages({
      'string.base': 'Email should be of type string',
      'string.required': 'Invalid email',
      'string.email': 'Invalid email',
    }),
  });
  return scheme.validate(data, { abortEarly: false });
};

const changeEmailSchema = (data) => {
  const scheme = Joi.object({
    newEmail: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .trim()
      .lowercase()
      .messages({
        'string.email': 'New email must be a valid email address',
        'any.required': 'New email is required',
      }),
    currentPassword: Joi.string().required().min(6).max(20).messages({
      'string.base': 'Password should be of type string',
      'string.min': 'Invalid password',
      'string.max': 'Invalid password',
      'string.empty': 'Password is a required field',
    }),
  });
  return scheme.validate(data, { abortEarly: false });
};

const verifyEmailSchema = (data) => {
  const schema = Joi.object({
    code: Joi.string().required().messages({
      'string.base': 'Code should be of type string',
      'any.required': 'Invalid code',
    }),
  });
  return schema.validate(data, { abortEarly: false });
};

module.exports = { emailSchema, changeEmailSchema, verifyEmailSchema };
