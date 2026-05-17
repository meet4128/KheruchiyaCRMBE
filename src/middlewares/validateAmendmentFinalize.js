const Joi = require('joi');
const { AMENDMENT_ACTION_VALUES } = require('../constants/amendmentAction');
const { AMENDMENT_TYPE_VALUES } = require('../constants/amendmentType');
const { messages } = require('../locales');

const t = messages.validation.amendment;

const noteSchema = Joi.object({
  text: Joi.string().required().trim().min(1).max(2000).messages({
    'string.empty': t.noteTextRequired,
  }),
});

const finalizeSchema = Joi.object({
  action: Joi.string()
    .valid(...AMENDMENT_ACTION_VALUES)
    .required()
    .messages({
      'any.only': t.actionInvalid,
      'string.empty': t.actionRequired,
    }),
  amendmentType: Joi.string()
    .valid(...AMENDMENT_TYPE_VALUES)
    .required()
    .messages({
      'any.only': t.amendmentTypeInvalid,
      'string.empty': t.amendmentTypeRequired,
    }),
  amountCharged: Joi.number()
    .min(0)
    .precision(2)
    .when('action', {
      is: 'mark_won',
      then: Joi.required().messages({
        'any.required': t.amountChargedRequired,
      }),
      otherwise: Joi.forbidden(),
    }),
  sessionId: Joi.string().trim().min(8).max(64).optional(),
  notes: Joi.array().items(noteSchema).max(50).optional(),
});

const validateAmendmentFinalize = (req, res, next) => {
  const { error, value } = finalizeSchema.validate(req.body, {
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

module.exports = validateAmendmentFinalize;
