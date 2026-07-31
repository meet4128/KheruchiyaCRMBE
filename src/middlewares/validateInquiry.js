const Joi = require('joi');
const { CHECKLIST_PRIORITY_VALUES } = require('../constants/checklistPriority');
const { INQUIRY_STATUS_VALUES } = require('../constants/inquiryStatus');
const {
  HOTEL_PROPERTY_TYPES,
  HOTEL_CATEGORIES,
  HOTEL_ROOM_VIEWS,
  HOTEL_AMENITIES,
  HOTEL_MEAL_PLANS,
  HOTEL_TRANSFERS,
  BOOKING_TYPE,
} = require('../constants/hotelBooking');
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
  // Optional flexible-window end — accepted per segment for every booking type,
  // including both Round-Trip segments. Absent → exact single-day departure.
  // When present it must be on or after departureDate (window start).
  departureDateEnd: Joi.date()
    .optional()
    .allow('')
    .empty('')
    .min(Joi.ref('departureDate'))
    .messages({
      'date.min': t.departureEndBeforeStart,
    }),
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
  remark: Joi.string().trim().optional().allow(''),
});

// ─── Hotel Booking schema (present only for typeOfBooking = "Hotel Booking") ──
const budgetString = Joi.string()
  .allow('')
  .pattern(/^\d+$/)
  .messages({ 'string.pattern.base': t.budgetDigitsOnly });

const hotelBookingSchema = Joi.object({
  city: Joi.string().required().trim(),
  checkInDate: Joi.date().required(),
  checkOutDate: Joi.date().min(Joi.ref('checkInDate')).required().messages({
    'date.min': t.checkOutBeforeCheckIn,
  }),
  rooms: Joi.number().integer().min(1).required(),
  adults: Joi.number().integer().min(1).required(),
  propertyType: Joi.array()
    .items(Joi.string().valid(...HOTEL_PROPERTY_TYPES))
    .optional()
    .default([]),
  hotelCategory: Joi.array()
    .items(Joi.string().valid(...HOTEL_CATEGORIES))
    .optional()
    .default([]),
  roomViews: Joi.array()
    .items(Joi.string().valid(...HOTEL_ROOM_VIEWS))
    .optional()
    .default([]),
  amenities: Joi.array()
    .items(Joi.string().valid(...HOTEL_AMENITIES))
    .optional()
    .default([]),
  mealPlan: Joi.array()
    .items(Joi.string().valid(...HOTEL_MEAL_PLANS))
    .optional()
    .default([]),
  transfers: Joi.array()
    .items(Joi.string().valid(...HOTEL_TRANSFERS))
    .optional()
    .default([]),
  budgetMin: budgetString.optional(),
  budgetMax: budgetString.optional(),
  remark: Joi.string().trim().optional().allow(''),
}).custom((value, helpers) => {
  const { budgetMin, budgetMax } = value;
  if (budgetMin && budgetMax && Number(budgetMax) < Number(budgetMin)) {
    return helpers.message(t.budgetMaxLessThanMin);
  }
  return value;
});

// Assigned user snapshot — mirrors the Member record at assignment time
const checklistUserSchema = Joi.object({
  _id: Joi.string().trim().optional().allow(''),
  fullName: Joi.string().trim().optional().allow(''),
  firstName: Joi.string().trim().optional().allow(''),
  lastName: Joi.string().trim().optional().allow(''),
  employeeId: Joi.string().trim().optional().allow(''),
});

const checklistItemSchema = Joi.object({
  user: Joi.array().items(checklistUserSchema).optional().default([]),
  dueDate: Joi.date().optional().allow('').empty(''),
  priority: Joi.string()
    .valid(...CHECKLIST_PRIORITY_VALUES)
    .required()
    .messages({
      'any.only': t.checklistPriorityInvalid,
      'any.required': t.checklistPriorityRequired,
      'string.empty': t.checklistPriorityRequired,
    }),
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
  // Branch on typeOfBooking: require the matching sub-object, forbid the other.
  // Any other typeOfBooking value leaves both optional (backward compatible).
  airTicket: Joi.when('typeOfBooking', {
    switch: [
      {
        is: BOOKING_TYPE.FLIGHT,
        then: airTicketSchema.required().messages({
          'any.required': t.airTicketRequired,
        }),
      },
      {
        is: BOOKING_TYPE.HOTEL,
        then: Joi.any().forbidden().messages({
          'any.unknown': t.airTicketForbidden,
        }),
      },
    ],
    otherwise: airTicketSchema.optional(),
  }),
  hotelBooking: Joi.when('typeOfBooking', {
    switch: [
      {
        is: BOOKING_TYPE.HOTEL,
        then: hotelBookingSchema.required().messages({
          'any.required': t.hotelBookingRequired,
        }),
      },
      {
        is: BOOKING_TYPE.FLIGHT,
        then: Joi.any().forbidden().messages({
          'any.unknown': t.hotelBookingForbidden,
        }),
      },
    ],
    otherwise: hotelBookingSchema.optional(),
  }),
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
