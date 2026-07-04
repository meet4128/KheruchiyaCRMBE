const Joi = require('joi');
const { messages } = require('../locales');

const MAX_LIMIT = 100;

const inquiryPhoneQuerySchema = Joi.object({
  number: Joi.string()
    .trim()
    .pattern(/^\d{5,15}$/)
    .required(),
  countryCode: Joi.string().trim().optional().allow(''),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).optional().default(10),
  sort: Joi.string().trim().optional().default('-createdAt'),
})
  .options({ stripUnknown: true })
  .messages({
    'any.required': messages.validation.inquiryPhoneQuery.numberRequired,
    'string.empty': messages.validation.inquiryPhoneQuery.numberRequired,
    'string.pattern.base': messages.validation.inquiryPhoneQuery.numberInvalid,
    'number.min': messages.validation.inquiryPhoneQuery.invalidPageLimit,
    'number.max': messages.validation.inquiryPhoneQuery.limitMax,
  });

/**
 * Validates GET /inquiries/by-phone query params. Returns 422 with errors if invalid.
 */
const validateInquiryPhoneQuery = (req, res, next) => {
  const { error, value } = inquiryPhoneQuerySchema.validate(req.query, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return res.status(422).json({
      status: 'fail',
      data: { message: messages.validation.failed, errors },
    });
  }

  req.query = value;
  next();
};

module.exports = validateInquiryPhoneQuery;
