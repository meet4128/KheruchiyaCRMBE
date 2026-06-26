const Joi = require('joi');
const { PAYMENT_MODE_VALUES } = require('../constants/paymentMode');
const { paymentProofUploadPattern } = require('./uploadPaymentProofFile');
const { messages } = require('../locales');

const t = messages.validation.payment;

const installmentSchema = Joi.object({
  amount: Joi.number().min(0).required().messages({
    'any.required': t.installmentAmountRequired,
    'number.base': t.installmentAmountRequired,
  }),
  dueDate: Joi.date().allow(null, '').optional(),
  receivedDate: Joi.date().allow(null, '').optional(),
  mode: Joi.string()
    .valid(...PAYMENT_MODE_VALUES)
    .allow(null, '')
    .optional()
    .messages({ 'any.only': t.modeInvalid }),
  status: Joi.string().trim().max(64).allow('').optional().default(''),
  paymentProofUrl: Joi.string()
    .trim()
    .max(2048)
    .allow('')
    .optional()
    .pattern(paymentProofUploadPattern)
    .messages({ 'string.pattern.base': t.proofUrlInvalid }),
});

const paymentPlanSchema = Joi.object({
  travelDate: Joi.date().allow(null, '').optional(),
  bookingType: Joi.string().trim().max(128).allow('').optional().default(''),
  totalAmount: Joi.number().min(0).required().messages({
    'any.required': t.totalAmountRequired,
    'number.base': t.totalAmountRequired,
  }),
  numberOfInstallments: Joi.number().integer().min(1).required().messages({
    'any.required': t.numberOfInstallmentsRequired,
    'number.base': t.numberOfInstallmentsRequired,
    'number.min': t.numberOfInstallmentsRequired,
  }),
  paymentReceivedTillNow: Joi.number().min(0).optional().default(0),
  installments: Joi.array().items(installmentSchema).min(1).max(60).required().messages({
    'array.min': t.installmentsRequired,
    'any.required': t.installmentsRequired,
  }),
})
  .custom((value, helpers) => {
    if (value.installments.length !== value.numberOfInstallments) {
      return helpers.error('installments.count');
    }
    return value;
  })
  .messages({ 'installments.count': t.installmentsCountMismatch });

const validatePaymentPlan = (req, res, next) => {
  const { error, value } = paymentPlanSchema.validate(req.body, {
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

module.exports = validatePaymentPlan;
