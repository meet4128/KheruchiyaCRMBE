const Joi = require('joi');
const { messages } = require('../locales');

const MAX_LIMIT = 100;

// Sort keys exposed to the client; mapped to real fields in the service.
const SORT_FIELDS = ['submittedAt', 'amount', 'createdAt'];
const SORT_VALUES = SORT_FIELDS.flatMap((f) => [f, `-${f}`]);

const unverifiedPaymentsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).optional().default(10),
  // Default: most recently submitted first.
  sort: Joi.string()
    .trim()
    .valid(...SORT_VALUES)
    .optional()
    .default('-submittedAt'),
  // General text search over contact name / inquiry reference / title.
  search: Joi.string().trim().max(100).optional().allow(''),
})
  .options({ stripUnknown: true })
  .messages({
    'number.min': messages.validation.unverifiedPaymentsQuery.invalidPageLimit,
    'number.max': messages.validation.unverifiedPaymentsQuery.limitMax,
    'any.only': messages.validation.unverifiedPaymentsQuery.invalidSort,
  });

/**
 * Validates GET /payments/unverified query params. Returns 422 with errors if invalid.
 */
const validateUnverifiedPaymentsQuery = (req, res, next) => {
  const { error, value } = unverifiedPaymentsQuerySchema.validate(req.query, {
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

module.exports = validateUnverifiedPaymentsQuery;
