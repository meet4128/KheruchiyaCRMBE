const Joi = require('joi');
const { INQUIRY_STATUS_VALUES } = require('../constants/inquiryStatus');
const { messages } = require('../locales');

const t = messages.validation.inquiryStatus;

// Body: { status } — the new inquiry status (must be a valid enum value).
const inquiryStatusSchema = Joi.object({
  status: Joi.string()
    .trim()
    .valid(...INQUIRY_STATUS_VALUES)
    .required()
    .messages({
      'string.empty': t.statusRequired,
      'any.required': t.statusRequired,
      'any.only': t.statusInvalid,
    }),
});

/**
 * Validates PATCH /inquiries/:id/status body. Returns 422 with errors if invalid.
 */
const validateInquiryStatus = (req, res, next) => {
  const { error, value } = inquiryStatusSchema.validate(req.body, {
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

module.exports = validateInquiryStatus;
