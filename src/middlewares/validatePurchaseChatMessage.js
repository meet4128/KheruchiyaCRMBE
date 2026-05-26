const Joi = require('joi');
const { AMENDMENT_MESSAGE_TYPE_VALUES } = require('../constants/amendmentMessageType');
const { purchaseChatUploadPattern } = require('./uploadPurchaseChatFile');
const { messages } = require('../locales');

const t = messages.validation.purchaseChat;

const schema = Joi.object({
  type: Joi.string()
    .valid(...AMENDMENT_MESSAGE_TYPE_VALUES)
    .optional()
    .default('text'),
  text: Joi.string().max(4096).trim().allow('').optional().default(''),
  mediaUrl: Joi.string().trim().max(2048).optional(),
  fileName: Joi.string().trim().max(255).optional(),
  mimeType: Joi.string().trim().max(128).optional(),
})
  .custom((value, helpers) => {
    const { type, text, mediaUrl } = value;
    if (type === 'text' && !text) {
      return helpers.error('text.required');
    }
    if ((type === 'document' || type === 'image') && !mediaUrl) {
      return helpers.error('media.required');
    }
    if (mediaUrl && !purchaseChatUploadPattern.test(mediaUrl)) {
      return helpers.error('media.invalid');
    }
    return value;
  })
  .options({ stripUnknown: true })
  .messages({
    'text.required': t.textRequired,
    'media.required': t.mediaUrlRequired,
    'media.invalid': t.mediaUrlInvalid,
  });

const validatePurchaseChatMessage = (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
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

module.exports = validatePurchaseChatMessage;
