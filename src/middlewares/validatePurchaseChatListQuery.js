const Joi = require('joi');
const mongoose = require('mongoose');
const { messages } = require('../locales');

const t = messages.validation.purchaseChat;

const schema = Joi.object({
  purchaseTeamMemberId: Joi.string()
    .optional()
    .custom((value, helpers) => {
      if (!value) return value;
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid': t.purchaseTeamMemberIdInvalid,
    }),
}).options({ stripUnknown: true });

const validatePurchaseChatListQuery = (req, res, next) => {
  const { error, value } = schema.validate(req.query, { abortEarly: false, convert: true });
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

module.exports = validatePurchaseChatListQuery;
