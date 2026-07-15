const Joi = require('joi');
const { messages } = require('../locales');

const t = messages.validation.inquiryAssign;

// Body: { userId } — the member id the inquiry is assigned/reassigned to.
const inquiryAssignSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .pattern(/^[a-f0-9]{24}$/i)
    .required()
    .messages({
      'string.empty': t.userIdRequired,
      'any.required': t.userIdRequired,
      'string.pattern.base': t.userIdInvalid,
    }),
});

/**
 * Validates PATCH /inquiries/:id/assign body. Returns 422 with errors if invalid.
 */
const validateInquiryAssign = (req, res, next) => {
  const { error, value } = inquiryAssignSchema.validate(req.body, {
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

module.exports = validateInquiryAssign;
