const Joi = require('joi');
const mongoose = require('mongoose');
const { RRule } = require('rrule');
const { CHECKLIST_PRIORITY_VALUES } = require('../constants/checklistPriority');
const { messages } = require('../locales');

const t = messages.validation.reminder;

/** Joi custom validator for a Mongo ObjectId */
const objectId = Joi.string().custom((value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error('any.invalid');
  }
  return value;
}, 'ObjectId');

/** Joi custom validator for an RFC 5545 RRULE string */
const rruleString = Joi.string()
  .trim()
  .max(500)
  .custom((value, helpers) => {
    if (value === '') return value;
    try {
      // rrulestr accepts a bare "FREQ=..." or a full "RRULE:FREQ=..." string
      RRule.fromString(value.replace(/^RRULE:/i, ''));
      return value;
    } catch {
      return helpers.error('any.invalid');
    }
  }, 'RRULE');

/** Create payload: inquiryId + amendmentId come from the route params */
const createSchema = Joi.object({
  note: Joi.string().trim().max(2000).allow('').optional(),
  remindAt: Joi.date().iso().required().messages({
    'any.required': t.remindAtRequired,
    'date.format': t.remindAtInvalid,
    'date.base': t.remindAtInvalid,
  }),
  recurrenceRule: rruleString.allow('').optional().messages({
    'any.invalid': t.recurrenceRuleInvalid,
  }),
  agent: objectId.required().messages({
    'any.required': t.agentRequired,
    'any.invalid': t.agentInvalid,
    'string.empty': t.agentRequired,
  }),
  inLoopUsers: Joi.array()
    .items(objectId.messages({ 'any.invalid': t.inLoopUserInvalid }))
    .max(50)
    .optional()
    .default([]),
  sessionId: Joi.string().trim().min(8).max(64).optional(),
  priority: Joi.string()
    .valid(...CHECKLIST_PRIORITY_VALUES)
    .required()
    .messages({
      'any.only': t.priorityInvalid,
      'any.required': t.priorityRequired,
      'string.empty': t.priorityRequired,
    }),
}).options({ stripUnknown: true });

/** Update payload: all fields optional; at least one must be present */
const updateSchema = Joi.object({
  note: Joi.string().trim().max(2000).allow('').optional(),
  remindAt: Joi.date().iso().optional().messages({
    'date.format': t.remindAtInvalid,
    'date.base': t.remindAtInvalid,
  }),
  recurrenceRule: rruleString.allow('').optional().messages({
    'any.invalid': t.recurrenceRuleInvalid,
  }),
  agent: objectId.optional().messages({ 'any.invalid': t.agentInvalid }),
  inLoopUsers: Joi.array()
    .items(objectId.messages({ 'any.invalid': t.inLoopUserInvalid }))
    .max(50)
    .optional(),
  priority: Joi.string()
    .valid(...CHECKLIST_PRIORITY_VALUES)
    .optional()
    .messages({ 'any.only': t.priorityInvalid }),
})
  .min(1)
  .options({ stripUnknown: true })
  .messages({ 'object.min': t.updateEmpty });

const makeValidator = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
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

module.exports = {
  validateReminderCreate: makeValidator(createSchema),
  validateReminderUpdate: makeValidator(updateSchema),
};
