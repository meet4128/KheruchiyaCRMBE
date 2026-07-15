const Joi = require('joi');
const { MEMBER_EMPLOYMENT_STATUS_VALUES } = require('../constants/memberEmploymentStatus');
const { messages } = require('../locales');

const MAX_LIMIT = 25;

const memberNameSearchQuerySchema = Joi.object({
  search: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': messages.validation.memberNameSearch.searchRequired,
    'string.min': messages.validation.memberNameSearch.searchRequired,
    'any.required': messages.validation.memberNameSearch.searchRequired,
  }),
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).optional().default(10),
  employmentStatus: Joi.string()
    .valid(...MEMBER_EMPLOYMENT_STATUS_VALUES)
    .optional(),
})
  .options({ stripUnknown: true })
  .messages({
    'number.min': messages.validation.memberQuery.invalidPageLimit,
    'number.max': messages.validation.memberNameSearch.limitMax,
  });

const validateMemberNameSearchQuery = (req, res, next) => {
  const { error, value } = memberNameSearchQuerySchema.validate(req.query, {
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

module.exports = validateMemberNameSearchQuery;
