const Joi = require('joi');
const { REMINDER_STATUS_VALUES } = require('../constants/reminderStatus');
const { messages } = require('../locales');

const t = messages.validation.reminder;

const statusSchema = Joi.object({
  status: Joi.string()
    .valid(...REMINDER_STATUS_VALUES)
    .required()
    .messages({
      'any.only': t.statusInvalid,
      'any.required': t.statusRequired,
      'string.empty': t.statusRequired,
    }),
  // Optional new time to reschedule the reminder alongside the status change
  remindAt: Joi.date().iso().optional().messages({
    'date.format': t.remindAtInvalid,
    'date.base': t.remindAtInvalid,
  }),
}).options({ stripUnknown: true });

const validateReminderStatus = (req, res, next) => {
  const { error, value } = statusSchema.validate(req.body, {
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

module.exports = validateReminderStatus;
