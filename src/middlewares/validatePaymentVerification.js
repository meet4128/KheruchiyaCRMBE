const Joi = require('joi');
const { messages } = require('../locales');

const t = messages.validation.paymentVerification;

// Account-team verify/un-verify action on a payment plan.
const paymentVerificationSchema = Joi.object({
  verified: Joi.boolean().required().messages({
    'any.required': t.verifiedRequired,
    'boolean.base': t.verifiedInvalid,
  }),
}).options({ stripUnknown: true });

/**
 * Validates PATCH /payments/:inquiryId/verify body. Returns 422 with errors if invalid.
 */
const validatePaymentVerification = (req, res, next) => {
  const { error, value } = paymentVerificationSchema.validate(req.body, {
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

  req.body = value;
  next();
};

module.exports = validatePaymentVerification;
