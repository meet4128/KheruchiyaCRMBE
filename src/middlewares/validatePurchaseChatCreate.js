const Joi = require('joi');
const mongoose = require('mongoose');
const { messages } = require('../locales');

const t = messages.validation.purchaseChat;

const schema = Joi.object({
  purchaseTeamMemberId: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.required': t.purchaseTeamMemberIdRequired,
      'any.invalid': t.purchaseTeamMemberIdInvalid,
    }),
}).options({ stripUnknown: true });

const validatePurchaseChatCreate = (req, res, next) => {
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

module.exports = validatePurchaseChatCreate;
