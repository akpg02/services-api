const Joi = require('joi');

const updateUserRoleSchema = (data) => {
  const scheme = Joi.object({
    role: Joi.array()
      .items(Joi.string().valid('buyer', 'seller', 'admin', 'user'))
      .min(1)
      .required()
      .messages({
        'any.only': "Role must be one of ['buyer', 'seller', 'admin']",
        'array.min': 'User must have at least one role',
      }),
  });
  return scheme.validate(data, { abortEarly: false });
};

module.exports = { updateUserRoleSchema };
