const Joi = require('joi');

const changeUsernameSchema = (data) => {
  const scheme = Joi.object({
    newUsername: Joi.string()
      .pattern(/^[a-zA-Z0-9]+$/) // Allows only letters (a-z, A-Z) and numbers (0-9)
      .min(6) // Minimum length of 6 characters
      .max(20) // Maximum length of 20 characters
      .required()
      .messages({
        'string.pattern.base':
          'Username must contain only letters and numbers.',
        'string.empty': 'Username is required.',
        'string.min': 'Username must be at least 3 characters long.',
        'string.max': 'Username must be at most 30 characters long.',
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
module.exports = { changeUsernameSchema };
