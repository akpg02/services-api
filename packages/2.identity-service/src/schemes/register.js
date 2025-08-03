const Joi = require('joi');

const registerSchema = (data) => {
  const schema = Joi.object({
    username: Joi.string()
      .pattern(/^[a-zA-Z0-9]+$/)
      .min(6) // Username must be at least 6 characters long
      .max(20) // Username must be at most 20 characters long
      .required()
      .messages({
        'string.pattern.base':
          'Username must contain only letters and numbers.',
        'string.empty': 'Username is required.',
        'string.min': 'Username must be at least 6 characters long.',
        'string.max': 'Username must be at most 20 characters long.',
      }),
    email: Joi.string().email().required().messages({
      'string.base': 'Email must be of type string.',
      'string.email': 'Invalid email format.',
      'string.empty': 'Email is a required field.',
    }),
    password: Joi.string()
      .min(6) // Password must be at least 6 characters long
      .max(20) // Password must be at most 20 characters long
      .required()
      .messages({
        'string.base': 'Password must be of type string.',
        'string.empty': 'Password is a required field.',
        'string.min': 'Password must be at least 6 characters long.',
        'string.max': 'Password must be at most 20 characters long.',
      }),
    firstname: Joi.string().optional(),
    lastname: Joi.string().optional(),
    phone: Joi.string().optional(),
    avatar: Joi.string().optional(),
    bio: Joi.string().optional(),
  });
  return schema.validate(data, { abortEarly: false });
};

module.exports = { registerSchema };
