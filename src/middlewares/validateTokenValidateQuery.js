const Joi = require('joi');
const { messages } = require('../locales');
const { AUTH_TOKEN_PURPOSE_VALUES } = require('../constants/authTokenPurpose');

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
  purpose: Joi.string()
    .required()
    .valid(...AUTH_TOKEN_PURPOSE_VALUES)
    .messages({
      'any.required': messages.validation.password.purposeRequired,
      'any.only': messages.validation.password.purposeInvalid,
    }),
});

const validateTokenValidateQuery = (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
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
  req.query = value;
  next();
};

module.exports = validateTokenValidateQuery;
