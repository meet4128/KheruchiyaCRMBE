const Joi = require('joi');
const { messages } = require('../locales');

const MAX_LIMIT = 100;

const conversationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).optional().default(10),
  search: Joi.string().trim().max(100).optional().allow(''),
})
  .options({ stripUnknown: true })
  .messages({
    'number.min': messages.validation.whatsappQuery.invalidPageLimit,
    'number.max': messages.validation.whatsappQuery.limitMax,
  });

/**
 * Validates GET /api/v1/whatsapp/conversations query params.
 */
const validateWhatsappConversationQuery = (req, res, next) => {
  const { error, value } = conversationQuerySchema.validate(req.query, {
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

module.exports = validateWhatsappConversationQuery;
