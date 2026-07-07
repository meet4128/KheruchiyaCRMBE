const Joi = require('joi');
const { AMENDMENT_TYPE_VALUES } = require('../constants/amendmentType');
const { AMENDMENT_STATUS_VALUES } = require('../constants/amendmentStatus');
const { messages } = require('../locales');

const MAX_LIMIT = 100;

const amendmentSearchQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).optional().default(10),
  sort: Joi.string().trim().optional().default('-createdAt'),
  // Partial match on amendment id (marked "Amendment Id" field)
  amendmentId: Joi.string().trim().max(100).optional().allow(''),
  // Exact enum match (marked "Type" field)
  amendmentType: Joi.string()
    .valid(...AMENDMENT_TYPE_VALUES)
    .optional(),
  // Exact enum match (amendment status)
  status: Joi.string()
    .valid(...AMENDMENT_STATUS_VALUES)
    .optional(),
  // processedAt range (marked "Processed From" / "Processed To")
  processedFrom: Joi.date().iso().optional(),
  processedTo: Joi.date().iso().min(Joi.ref('processedFrom')).optional(),
  // createdAt range (marked "From Date" / "To Date" — the "Generated Time" column)
  createdFrom: Joi.date().iso().optional(),
  createdTo: Joi.date().iso().min(Joi.ref('createdFrom')).optional(),
  // General text search over amendment id
  search: Joi.string().trim().max(100).optional().allow(''),
})
  .options({ stripUnknown: true })
  .messages({
    'number.min': messages.validation.amendmentSearchQuery.invalidPageLimit,
    'number.max': messages.validation.amendmentSearchQuery.limitMax,
    'date.min': messages.validation.amendmentSearchQuery.invalidDateRange,
    'date.format': messages.validation.amendmentSearchQuery.invalidDate,
    'any.only': messages.validation.amendmentSearchQuery.invalidEnum,
  });

/**
 * Validates GET /amendments/search query params. Returns 422 with errors if invalid.
 */
const validateAmendmentSearchQuery = (req, res, next) => {
  const { error, value } = amendmentSearchQuerySchema.validate(req.query, {
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

module.exports = validateAmendmentSearchQuery;
