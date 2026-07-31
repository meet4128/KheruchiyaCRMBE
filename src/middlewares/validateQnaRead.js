const Joi = require('joi');
const { messages } = require('../locales');

const t = messages.validation.qnaRead;

// Body: optional { readAt } — an explicit ISO read time. When omitted the
// server stamps now(). Sent by the client when a user opens an inquiry's Q&A.
const qnaReadSchema = Joi.object({
  readAt: Joi.date().iso().optional().messages({
    'date.base': t.readAtInvalid,
    'date.format': t.readAtInvalid,
  }),
});

/**
 * Validates POST /inquiries/:inquiryId/qna/read body. Returns 422 if invalid.
 */
const validateQnaRead = (req, res, next) => {
  const { error, value } = qnaReadSchema.validate(req.body || {}, {
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

module.exports = validateQnaRead;
