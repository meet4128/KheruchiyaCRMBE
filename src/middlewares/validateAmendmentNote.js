const Joi = require('joi');
const { messages } = require('../locales');

const t = messages.validation.amendment;

const noteSchema = Joi.object({
  text: Joi.string().required().trim().min(1).max(2000).messages({
    'string.empty': t.noteTextRequired,
  }),
});

const validateAmendmentNote = (req, res, next) => {
  const { error, value } = noteSchema.validate(req.body, {
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

module.exports = validateAmendmentNote;
