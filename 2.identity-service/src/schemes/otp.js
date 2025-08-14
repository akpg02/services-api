const Joi = require('joi');

exports.sendOTPSchema = (data) => {
  const scheme = Joi.object({
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^\+\d{10,15}$/),
  }).or('email', 'phone');
  return scheme.validate(data, { abortEarly: false });
};

exports.verifyOTPScheme = (data) => {
  const scheme = Joi.object({
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^\+\d{10,15}$/),
    otp: Joi.string().length(6).required(),
  });
  return scheme.validate(data, { abortEarly: false });
};
