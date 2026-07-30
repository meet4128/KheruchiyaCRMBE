const Joi = require('joi');
const mongoose = require('mongoose');
const { messages } = require('../locales');

const MAX_LIMIT = 100;

const messagesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).optional().default(50),
  sort: Joi.string().trim().optional().default('createdAt'),
  inquiryId: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!value) return value;
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .optional()
    .messages({
      'any.invalid': messages.validation.whatsapp.inquiryIdInvalid,
    }),
})
  .options({ stripUnknown: true })
  .messages({
    'number.min': messages.validation.whatsappQuery.invalidPageLimit,
    'number.max': messages.validation.whatsappQuery.limitMax,
  });

/**
 * Validates GET /api/v1/whatsapp/conversations/:peerPhone/messages query params.
 */
const validateWhatsappMessagesQuery = (req, res, next) => {
  const { error, value } = messagesQuerySchema.validate(req.query, {
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

module.exports = validateWhatsappMessagesQuery;
