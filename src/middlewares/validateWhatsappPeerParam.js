const Joi = require('joi');
const { messages } = require('../locales');

const peerParamSchema = Joi.object({
  peerPhone: Joi.string()
    .pattern(/^\d{10,15}$/)
    .required()
    .messages({
      'string.pattern.base': messages.validation.whatsapp.peerPhoneInvalid,
    }),
});

/**
 * Validates :peerPhone path param on conversation message routes.
 */
const validateWhatsappPeerParam = (req, res, next) => {
  const { error, value } = peerParamSchema.validate(req.params, {
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

  req.params = value;
  next();
};

module.exports = validateWhatsappPeerParam;
