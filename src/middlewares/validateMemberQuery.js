const Joi = require('joi');
const { MEMBER_EMPLOYMENT_STATUS_VALUES } = require('../constants/memberEmploymentStatus');
const { messages } = require('../locales');

const MAX_LIMIT = 100;

const memberQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).optional().default(10),
  sort: Joi.string().trim().optional().default('-createdAt'),
  employmentStatus: Joi.string()
    .valid(...MEMBER_EMPLOYMENT_STATUS_VALUES)
    .optional(),
  city: Joi.string().trim().optional().allow(''),
  search: Joi.string().trim().max(100).optional().allow(''),
})
  .options({ stripUnknown: true })
  .messages({
    'number.min': messages.validation.memberQuery.invalidPageLimit,
    'number.max': messages.validation.memberQuery.limitMax,
  });

const validateMemberQuery = (req, res, next) => {
  const { error, value } = memberQuerySchema.validate(req.query, {
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

module.exports = validateMemberQuery;
