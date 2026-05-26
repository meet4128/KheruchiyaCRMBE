const Joi = require('joi');
const { messages } = require('../locales');

const schema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .trim()
    .lowercase()
    .messages({
      'any.required': messages.validation.password.emailRequired,
      'string.empty': messages.validation.password.emailRequired,
      'string.email': messages.validation.password.emailInvalid,
    }),
});

const validateForgotPassword = (req, res, next) => {
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

module.exports = validateForgotPassword;
