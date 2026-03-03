const Joi = require('joi');
const { INQUIRY_STATUS_VALUES } = require('../constants/inquiryStatus');
const { messages } = require('../locales');

const MAX_LIMIT = 100;

const inquiryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).optional().default(10),
  sort: Joi.string().trim().optional().default('-createdAt'),
  status: Joi.string()
    .valid(...INQUIRY_STATUS_VALUES)
    .optional(),
  typeOfBooking: Joi.string().trim().optional().allow(''),
  typeOfClient: Joi.string().trim().optional().allow(''),
  search: Joi.string().trim().max(100).optional().allow(''),
})
  .options({ stripUnknown: true })
  .messages({
    'number.min': messages.validation.inquiryQuery.invalidPageLimit,
    'number.max': messages.validation.inquiryQuery.limitMax,
  });

/**
 * Validates GET /inquiries query params. Returns 422 with errors if invalid.
 */
const validateInquiryQuery = (req, res, next) => {
  const { error, value } = inquiryQuerySchema.validate(req.query, {
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

module.exports = validateInquiryQuery;
