const mongoose = require('mongoose');
const { CHECKLIST_PRIORITY_VALUES } = require('../constants/checklistPriority');
const { INQUIRY_STATUS_VALUES } = require('../constants/inquiryStatus');
const {
  HOTEL_PROPERTY_TYPES,
  HOTEL_CATEGORIES,
  HOTEL_ROOM_VIEWS,
  HOTEL_AMENITIES,
  HOTEL_MEAL_PLANS,
  HOTEL_TRANSFERS,
} = require('../constants/hotelBooking');
const { messages } = require('../locales');

// ─── Sub-documents for clean schema organization ────────────────────────────

/** Phone/Reference number format: { countryCode, number } */
const contactNumberSchema = new mongoose.Schema(
  {
    countryCode: { type: String, required: true, trim: true },
    number: { type: String, required: true, trim: true },
  },
  { _id: false }
);

/** Flight segment: from/to, departure, traveller count, class */
const flightSegmentSchema = new mongoose.Schema(
  {
    from: {
      code: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
    },
    to: {
      code: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
    },
    departureDate: { type: Date, required: true },
    travellerCount: { type: Number, required: true, min: 1 },
    travelClass: { type: String, required: true, trim: true },
  },
  { _id: false }
);

/** Air Ticket booking details — embedded sub-document */
const airTicketSchema = new mongoose.Schema(
  {
    bookingType: {
      type: String,
      required: true,
      enum: ['ONE_WAY', 'ROUND_TRIP', 'MULTI_CITY'],
    },
    flightSegments: {
      type: [flightSegmentSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 1,
        message: messages.model.flightSegmentRequired,
      },
    },
    typeOfVisa: {
      type: String,
      enum: ['Visitor Visa', 'Student Visa', 'PR', 'Work Permit'],
      set: (v) => (v === '' || v === null ? undefined : v),
      default: undefined,
    },
    remark: { type: String, required: true, trim: true },
  },
  { _id: false }
);

/** Hotel Booking details — embedded sub-document (list fields hold label strings) */
const hotelBookingSchema = new mongoose.Schema(
  {
    city: { type: String, required: true, trim: true },
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },
    rooms: { type: Number, required: true, min: 1 },
    adults: { type: Number, required: true, min: 1 },
    propertyType: { type: [String], enum: HOTEL_PROPERTY_TYPES, default: [] },
    hotelCategory: { type: [String], enum: HOTEL_CATEGORIES, default: [] },
    roomViews: { type: [String], enum: HOTEL_ROOM_VIEWS, default: [] },
    amenities: { type: [String], enum: HOTEL_AMENITIES, default: [] },
    mealPlan: { type: [String], enum: HOTEL_MEAL_PLANS, default: [] },
    transfers: { type: [String], enum: HOTEL_TRANSFERS, default: [] },
    budgetMin: { type: String, trim: true, default: '' },
    budgetMax: { type: String, trim: true, default: '' },
    remark: { type: String, required: true, trim: true },
  },
  { _id: false }
);

/** Checklist item — assigned user, due date, priority, category */
const checklistItemSchema = new mongoose.Schema(
  {
    user: { type: String, trim: true, default: '' },
    dueDate: { type: Date, set: (v) => (v === '' || v === null ? undefined : v) },
    priority: {
      type: String,
      enum: CHECKLIST_PRIORITY_VALUES,
      required: true,
      trim: true,
    },
    category: { type: String, trim: true, default: '' },
    inLoop: { type: Boolean, default: false },
    repeat: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: true }
);

// ─── Main Inquiry Schema ─────────────────────────────────────────────────────

const inquirySchema = new mongoose.Schema(
  {
    // Inquiry Form fields
    title: { type: String, required: true, trim: true },
    phoneNumber: { type: contactNumberSchema, required: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    typeOfClient: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    referenceNumber: { type: contactNumberSchema, required: true },
    referenceName: { type: String, required: true, trim: true },
    clientBehaviour: { type: String, required: true, trim: true },
    typeOfBooking: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: INQUIRY_STATUS_VALUES,
      default: 'PENDING',
    },
    // Audit
    createdBy: { type: String, required: true, trim: true },
    // Air Ticket Form (booking details) — embedded sub-document (Flight Booking)
    airTicket: { type: airTicketSchema },
    // Hotel Booking Form (booking details) — embedded sub-document (Hotel Booking)
    hotelBooking: { type: hotelBookingSchema },
    // Checklist array
    checklist: {
      type: [checklistItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Performance indexes (industry standard) ─────────────────────────────────

/** Email: lookup / search by contact */
inquirySchema.index({ email: 1 }, { sparse: true });

/** Reference number: compound unique for duplicate detection & fast lookups */
inquirySchema.index(
  { 'referenceNumber.countryCode': 1, 'referenceNumber.number': 1 },
  { unique: true }
);

/** Status: for filter performance on GET /inquiries */
inquirySchema.index({ status: 1 });

const Inquiry = mongoose.model('Inquiry', inquirySchema);

module.exports = Inquiry;
