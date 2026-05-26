const Joi = require('joi');
const { messages } = require('../locales');

const schema = Joi.object({
  token: Joi.string()
    .required()
    .trim()
    .pattern(/^[a-f0-9]{64}$/i)
    .messages({
      'any.required': messages.validation.password.tokenRequired,
      'string.empty': messages.validation.password.tokenRequired,
      'string.pattern.base': messages.validation.password.tokenInvalid,
    }),
  password: Joi.string()
    .required()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
    .messages({
      'any.required': messages.validation.password.passwordRequired,
      'string.empty': messages.validation.password.passwordRequired,
      'string.min': messages.validation.password.lengthInvalid,
      'string.max': messages.validation.password.lengthInvalid,
      'string.pattern.base': messages.validation.password.strengthInvalid,
    }),
});

const validateSetPassword = (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) {
    const errors = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
    return res.status(422).json({
      status: 'fail',
      data: { message: messages.validation.failed, errors },
    });
  }
  req.body = value;
  next();
};

module.exports = validateSetPassword;
