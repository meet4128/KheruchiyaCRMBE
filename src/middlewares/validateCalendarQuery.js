const Joi = require('joi');
const mongoose = require('mongoose');
const { REMINDER_STATUS_VALUES } = require('../constants/reminderStatus');
const { messages } = require('../locales');

const t = messages.validation.calendarQuery;

/** Max span the calendar may request in one call (bounds recurrence expansion) */
const MAX_RANGE_DAYS = 92;
const MAX_RANGE_MS = MAX_RANGE_DAYS * 24 * 60 * 60 * 1000;

const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId');

const calendarQuerySchema = Joi.object({
  from: Joi.date().iso().required().messages({
    'any.required': t.fromRequired,
    'date.format': t.dateInvalid,
    'date.base': t.dateInvalid,
  }),
  to: Joi.date()
    .iso()
    .required()
    .min(Joi.ref('from'))
    .messages({
      'any.required': t.toRequired,
      'date.format': t.dateInvalid,
      'date.base': t.dateInvalid,
      'date.min': t.toBeforeFrom,
    })
    .custom((value, helpers) => {
      const { from } = helpers.state.ancestors[0];
      if (from && value.getTime() - new Date(from).getTime() > MAX_RANGE_MS) {
        return helpers.error('any.custom', { message: t.rangeTooLarge });
      }
      return value;
    }),
  agent: objectId.optional().messages({ 'any.invalid': t.agentInvalid }),
  status: Joi.string()
    .valid(...REMINDER_STATUS_VALUES)
    .optional()
    .messages({ 'any.only': t.statusInvalid }),
})
  .options({ stripUnknown: true })
  .messages({ 'any.custom': t.rangeTooLarge });

const validateCalendarQuery = (req, res, next) => {
  const { error, value } = calendarQuerySchema.validate(req.query, {
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

  req.query = value;
  next();
};

module.exports = validateCalendarQuery;
