const Joi = require('joi');

const passwordSchema = (data) => {
  const schema = Joi.object({
    password: Joi.string().required().min(6).max(20).messages({
      'string.base': 'Password should be of type string',
      'string.min': 'Invalid password',
      'string.max': 'Invalid password',
      'string.empty': 'Password is a required field',
    }),
    confirmPassword: Joi.string()
      .required()
      .valid(Joi.ref('password'))
      .messages({
        'any.only': 'Passwords should match',
        'any.required': 'Confirm password is a required field',
      }),
  });
  return schema.validate(data, { abortEarly: false });
};

const changePasswordSchema = (data) => {
  const schema = Joi.object({
    currentPassword: Joi.string().required().min(6).max(20).messages({
      'string.base': 'Password should be of type string',
      'string.min': 'Invalid password',
      'string.max': 'Invalid password',
      'string.empty': 'Password is a required field',
    }),
    newPassword: Joi.string().required().min(6).max(20).messages({
      'string.base': 'Password should be of type string',
      'string.min': 'Invalid password',
      'string.max': 'Invalid password',
      'string.empty': 'Password is a required field',
    }),
  });
  return schema.validate(data, { abortEarly: false });
};

const forgotPasswordSchema = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required().messages({
      'string.base': 'Email must be of type string.',
      'string.email': 'Invalid email format.',
      'string.empty': 'Email is a required field.',
    }),
  });
  return schema.validate(data, { abortEarly: false });
};

const resetPasswordSchema = (data) => {
  const schema = Joi.object({
    password: Joi.string().required().min(6).max(20).messages({
      'string.base': 'Password should be of type string',
      'string.min': 'Invalid password',
      'string.max': 'Invalid password',
      'string.empty': 'Password is a required field',
    }),
  });
  return schema.validate(data, { abortEarly: false });
};

module.exports = {
  passwordSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
