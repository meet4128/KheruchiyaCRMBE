const Joi = require('joi');
const { messages } = require('../locales');

const t = messages.validation.whatsapp;

const sendTextSchema = Joi.object({
  to: Joi.string()
    .pattern(/^\d{10,15}$/)
    .required()
    .messages({
      'string.pattern.base': t.toInvalid,
      'string.empty': t.toRequired,
    }),
  text: Joi.string().required().min(1).max(4096).trim().messages({
    'string.empty': t.textRequired,
    'string.max': t.textTooLong,
  }),
});

/**
 * Validates POST /api/v1/whatsapp/send body.
 */
const validateWhatsappSend = (req, res, next) => {
  const { error, value } = sendTextSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
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

  req.body = value;
  next();
};

module.exports = validateWhatsappSend;
