const Joi = require('joi');
const { INQUIRY_STATUS_VALUES } = require('../constants/inquiryStatus');
const { messages } = require('../locales');

const t = messages.validation.inquiry;

// ─── Reusable schemas ──────────────────────────────────────────────────────
// Phone/Reference number format: { countryCode, number }
const contactNumberSchema = Joi.object({
  countryCode: Joi.string().required().trim(),
  number: Joi.string().pattern(/^\d+$/).min(6).required().messages({
    'string.pattern.base': t.phoneDigitsOnly,
  }),
});

const flightSegmentSchema = Joi.object({
  from: Joi.object({
    code: Joi.string().required().trim(),
    city: Joi.string().required().trim(),
  }).required(),
  to: Joi.object({
    code: Joi.string().required().trim(),
    city: Joi.string().required().trim(),
  }).required(),
  departureDate: Joi.date().required(),
  travellerCount: Joi.number().integer().min(1).required(),
  travelClass: Joi.string().required().trim(),
});

const airTicketSchema = Joi.object({
  bookingType: Joi.string().valid('ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY').required(),
  flightSegments: Joi.array()
    .items(flightSegmentSchema)
    .required()
    .when(Joi.ref('bookingType'), {
      is: Joi.valid('ROUND_TRIP', 'MULTI_CITY'),
      then: Joi.array().items(flightSegmentSchema).min(2).required().messages({
        'array.min': t.flightSegmentsMin,
      }),
      otherwise: Joi.array().items(flightSegmentSchema).min(1).required(),
    }),
  typeOfVisa: Joi.string()
    .valid('Visitor Visa', 'Student Visa', 'PR', 'Work Permit')
    .optional()
    .allow('')
    .empty(''),
  remark: Joi.string().required().trim(),
}).optional(); // Required when present; omit for inquiry-only submissions

const checklistItemSchema = Joi.object({
  user: Joi.string().trim().optional().allow(''),
  dueDate: Joi.date().optional().allow('').empty(''),
  priority: Joi.string().trim().optional().allow(''),
  category: Joi.string().trim().optional().allow(''),
  inLoop: Joi.boolean().optional().default(false),
  repeat: Joi.object().optional(),
});

// ─── Main Inquiry validation schema (mandatory fields per UI red asterisks) ───

const inquiryCreateSchema = Joi.object({
  title: Joi.string().required().trim().messages({
    'string.empty': t.titleRequired,
  }),
  phoneNumber: contactNumberSchema.required().messages({
    'object.base': t.phoneNumberRequired,
  }),
  fullName: Joi.string().required().trim().messages({
    'string.empty': t.fullNameRequired,
  }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .optional()
    .allow('')
    .messages({
      'string.email': t.emailInvalid,
    }),
  typeOfClient: Joi.string().required().trim().messages({
    'string.empty': t.typeOfClientRequired,
  }),
  address: Joi.string().required().trim().messages({
    'string.empty': t.addressRequired,
  }),
  referenceNumber: contactNumberSchema.required().messages({
    'object.base': t.referenceNumberRequired,
  }),
  referenceName: Joi.string().required().trim().messages({
    'string.empty': t.referenceNameRequired,
  }),
  clientBehaviour: Joi.string().required().trim().messages({
    'string.empty': t.clientBehaviourRequired,
  }),
  typeOfBooking: Joi.string().required().trim().messages({
    'string.empty': t.typeOfBookingRequired,
  }),
  status: Joi.string()
    .valid(...INQUIRY_STATUS_VALUES)
    .optional()
    .default('PENDING'),
  airTicket: airTicketSchema,
  checklist: Joi.array().items(checklistItemSchema).optional().default([]),
});

/**
 * Validates inquiry request body. Returns 422 with formatted errors if invalid.
 */
const validateInquiry = (req, res, next) => {
  const { error, value } = inquiryCreateSchema.validate(req.body, {
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

module.exports = validateInquiry;
