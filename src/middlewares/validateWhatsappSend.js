const Joi = require('joi');
const mongoose = require('mongoose');
const { WHATSAPP_SEND_TYPE, WHATSAPP_SEND_TYPE_VALUES } = require('../constants/whatsappSendType');
const { messages } = require('../locales');

const t = messages.validation.whatsapp;

const templateSchema = Joi.object({
  name: Joi.string()
    .trim()
    .pattern(/^[a-z0-9_]+$/)
    .required()
    .messages({
      'string.pattern.base': t.templateNameInvalid,
      'any.required': t.templateNameRequired,
      'string.empty': t.templateNameRequired,
    }),
  language: Joi.string().trim().min(2).max(10).required().messages({
    'any.required': t.templateLanguageRequired,
    'string.empty': t.templateLanguageRequired,
  }),
  bodyParams: Joi.array().items(Joi.string().trim().max(1024)).optional().default([]),
  headerParams: Joi.array().items(Joi.string().trim().max(1024)).optional().default([]),
});

const sendSchema = Joi.object({
  to: Joi.string()
    .pattern(/^\d{10,15}$/)
    .required()
    .messages({
      'string.pattern.base': t.toInvalid,
      'string.empty': t.toRequired,
    }),
  type: Joi.string()
    .valid(...WHATSAPP_SEND_TYPE_VALUES)
    .optional()
    .default('text')
    .messages({
      'any.only': t.typeInvalid,
    }),
  text: Joi.string().max(4096).trim().allow('').optional().default(''),
  template: templateSchema.optional(),
  sessionId: Joi.string().trim().min(8).max(64).optional(),
  inquiryId: Joi.string()
    .custom((value, helpers) => {
      if (!value) return value;
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .optional()
    .messages({
      'any.invalid': t.inquiryIdInvalid,
    }),
  mediaUrl: Joi.string().trim().max(2048).optional(),
  fileName: Joi.string().trim().max(255).optional(),
})
  .custom((value, helpers) => {
    const { type, text, sessionId, inquiryId, mediaUrl, template } = value;
    if (type === WHATSAPP_SEND_TYPE.TEXT && !text) {
      return helpers.error('text.required');
    }
    if (type === WHATSAPP_SEND_TYPE.TEMPLATE && !template) {
      return helpers.error('template.required');
    }
    if ((type === WHATSAPP_SEND_TYPE.DOCUMENT || type === WHATSAPP_SEND_TYPE.IMAGE) && !mediaUrl) {
      return helpers.error('media.required');
    }
    if ((sessionId && !inquiryId) || (!sessionId && inquiryId)) {
      return helpers.error('session.pair');
    }
    return value;
  })
  .messages({
    'text.required': t.textRequired,
    'template.required': t.templateRequired,
    'media.required': messages.validation.amendment.mediaUrlRequired,
    'session.pair': 'sessionId and inquiryId must be provided together',
  });

const validateWhatsappSend = (req, res, next) => {
  const { error, value } = sendSchema.validate(req.body, {
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
