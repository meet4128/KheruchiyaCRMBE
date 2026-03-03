const Joi = require('joi');

// ─── Reusable schemas ──────────────────────────────────────────────────────

const contactNumberSchema = Joi.object({
  countryCode: Joi.string().required().trim(),
  number: Joi.string()
    .pattern(/^\d+$/)
    .min(6)
    .required()
    .messages({
      'string.pattern.base': 'Phone/Reference number must contain digits only',
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
  bookingType: Joi.string()
    .valid('ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY')
    .required(),
  flightSegments: Joi.array()
    .items(flightSegmentSchema)
    .required()
    .when(Joi.ref('bookingType'), {
      is: Joi.valid('ROUND_TRIP', 'MULTI_CITY'),
      then: Joi.array().items(flightSegmentSchema).min(2).required().messages({
        'array.min': 'ROUND_TRIP and MULTI_CITY require at least 2 flight segments',
      }),
      otherwise: Joi.array().items(flightSegmentSchema).min(1).required(),
    }),
  typeOfVisa: Joi.string()
    .valid('Visitor Visa', 'Student Visa', 'PR', 'Work Permit')
    .optional()
    .allow(''),
  remark: Joi.string().required().trim(),
}).optional(); // Required when present; omit for inquiry-only submissions

const checklistItemSchema = Joi.object({
  user: Joi.string().required().trim(),
  dueDate: Joi.date().required(),
  priority: Joi.string().required().trim(),
  category: Joi.string().required().trim(),
  inLoop: Joi.boolean().optional().default(false),
  repeat: Joi.object().optional(),
});

// ─── Main Inquiry validation schema (mandatory fields per UI red asterisks) ───

const inquiryCreateSchema = Joi.object({
  title: Joi.string().required().trim().messages({
    'string.empty': 'Title is required',
  }),
  phoneNumber: contactNumberSchema.required().messages({
    'object.base': 'Phone Number is required',
  }),
  fullName: Joi.string().required().trim().messages({
    'string.empty': 'Full Name is required',
  }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .optional()
    .allow('')
    .messages({
      'string.email': 'Please provide a valid email',
    }),
  typeOfClient: Joi.string().required().trim().messages({
    'string.empty': 'Type of Client is required',
  }),
  address: Joi.string().required().trim().messages({
    'string.empty': 'Address is required',
  }),
  referenceNumber: contactNumberSchema.required().messages({
    'object.base': 'Reference Number is required',
  }),
  referenceName: Joi.string().required().trim().messages({
    'string.empty': 'Reference Name is required',
  }),
  clientBehaviour: Joi.string().required().trim().messages({
    'string.empty': 'Client Behaviour is required',
  }),
  typeOfBooking: Joi.string().required().trim().messages({
    'string.empty': 'Type of Booking is required',
  }),
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
      data: { message: 'Validation Failed', errors },
    });
  }

  req.body = value;
  next();
};

module.exports = validateInquiry;
