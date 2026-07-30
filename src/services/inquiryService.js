const mongoose = require('mongoose');
const Inquiry = require('../models/Inquiry');
const amendmentService = require('./amendmentService');
const memberService = require('./memberService');
const counterService = require('./counterService');
const AppError = require('../utils/AppError');
const { getChecklistPriorityDefaults } = require('../constants/checklistPriority');
const { INQUIRY_STATUS_VALUES } = require('../constants/inquiryStatus');
const { INQUIRY_NUMBER_COUNTER_ID } = require('../constants/inquiryNumber');
const { AUTH_ROLE } = require('../constants/authRole');
const { applyChecklistDueDates } = require('../utils/checklistDueDate');
const { buildInquiryNumber } = require('../utils/inquiryNumber');
const { messages } = require('../locales');

/**
 * Builds the visibility scope for a caller. Admin sees everything (null = no
 * scope). Every other role sees only unassigned inquiries (shared pool) plus
 * inquiries assigned to themselves.
 */
const buildAssignmentScope = (authUser) => {
  if (!authUser || String(authUser.role).toLowerCase() === AUTH_ROLE.ADMIN) {
    return null;
  }
  return {
    $or: [{ assignedTo: null }, { 'assignedTo._id': String(authUser.id) }],
  };
};

/** Combines a base filter with an optional visibility scope. */
const applyScope = (filter, scope) => (scope ? { $and: [filter, scope] } : filter);

/** Allowed sort fields to prevent query injection */
const ALLOWED_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'fullName',
  'typeOfBooking',
  'typeOfClient',
  'status',
];

const createInquiry = async (payload) => {
  // Reference number and phone number are intentionally NOT unique: the same
  // client (ref/phone) may raise multiple inquiries across hotel and air ticket
  // bookings, so duplicates are allowed.

  // Assign a human-readable inquiry number once, at creation. The sequence is a
  // single shared, ever-increasing counter (never resets); the atomic $inc makes
  // concurrent creates get distinct numbers. Prefix + FY come from the payload.
  const seq = await counterService.getNextSequence(INQUIRY_NUMBER_COUNTER_ID);
  const inquiryNumber = buildInquiryNumber({
    typeOfBooking: payload.typeOfBooking,
    seq,
  });

  const payloadWithDueDates = {
    ...payload,
    inquiryNumber,
    checklist: applyChecklistDueDates(payload.checklist),
  };

  const inquiry = await Inquiry.create(payloadWithDueDates);
  return inquiry;
};

/**
 * Builds a Mongoose query for listing inquiries with filters, search, pagination, and sorting.
 *
 * @param {Object} queryParams - Raw query params from Express (req.query)
 * @returns {Promise<{ items: any[], page: number, limit: number, totalItems: number, totalPages: number }>}
 */
const getAllInquiries = async (queryParams = {}, authUser = null) => {
  const {
    page = 1,
    limit = 10,
    typeOfBooking,
    typeOfClient,
    status,
    search,
    sort = '-createdAt',
  } = queryParams;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
  const skip = (pageNum - 1) * limitNum;

  // Sanitize sort: allowlist to prevent query injection
  const rawSort = String(sort || '').trim();
  const direction = rawSort.startsWith('-') ? -1 : 1;
  const field = rawSort.replace(/^-/, '').trim() || 'createdAt';
  const safeSort = ALLOWED_SORT_FIELDS.includes(field) ? { [field]: direction } : { createdAt: -1 };

  // Base filter
  const filter = {};

  if (typeOfBooking) {
    filter.typeOfBooking = typeOfBooking;
  }

  if (typeOfClient) {
    filter.typeOfClient = typeOfClient;
  }

  // Status filter: only allow valid enum values
  if (status && INQUIRY_STATUS_VALUES.includes(status)) {
    filter.status = status;
  }

  if (search) {
    // Escape special regex chars to prevent ReDoS
    const sanitized = String(search)
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(sanitized, 'i');
    filter.$or = [{ fullName: searchRegex }, { 'phoneNumber.number': searchRegex }];
  }

  // Visibility: non-admin callers see only unassigned + self-assigned inquiries.
  const scopedFilter = applyScope(filter, buildAssignmentScope(authUser));

  const query = Inquiry.find(scopedFilter).skip(skip).limit(limitNum).sort(safeSort);

  const [items, totalItems] = await Promise.all([
    query.exec(),
    Inquiry.countDocuments(scopedFilter),
  ]);

  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  return {
    items,
    page: pageNum,
    limit: limitNum,
    totalItems,
    totalPages,
  };
};

/**
 * Lists inquiries matching a phone number, with pagination and sorting.
 * Matches on phoneNumber.number, optionally scoped by phoneNumber.countryCode.
 *
 * @param {Object} queryParams - Validated query params from req.query
 * @returns {Promise<{ items: any[], page: number, limit: number, totalItems: number, totalPages: number }>}
 */
const getInquiriesByPhone = async (queryParams = {}, authUser = null) => {
  const { number, countryCode, page = 1, limit = 10, sort = '-createdAt' } = queryParams;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
  const skip = (pageNum - 1) * limitNum;

  // Sanitize sort: allowlist to prevent query injection
  const rawSort = String(sort || '').trim();
  const direction = rawSort.startsWith('-') ? -1 : 1;
  const field = rawSort.replace(/^-/, '').trim() || 'createdAt';
  const safeSort = ALLOWED_SORT_FIELDS.includes(field) ? { [field]: direction } : { createdAt: -1 };

  const filter = { 'phoneNumber.number': number };

  if (countryCode) {
    filter['phoneNumber.countryCode'] = countryCode;
  }

  // Visibility: non-admin callers see only unassigned + self-assigned inquiries.
  const scopedFilter = applyScope(filter, buildAssignmentScope(authUser));

  const query = Inquiry.find(scopedFilter).skip(skip).limit(limitNum).sort(safeSort);

  const [items, totalItems] = await Promise.all([
    query.exec(),
    Inquiry.countDocuments(scopedFilter),
  ]);

  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  return {
    items,
    page: pageNum,
    limit: limitNum,
    totalItems,
    totalPages,
  };
};

const getInquiryById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(messages.errors.invalidIdOrFormat, 400);
  }

  const inquiry = await Inquiry.findById(id).lean();
  if (!inquiry) {
    throw new AppError(messages.errors.inquiryNotFound, 404);
  }

  const amendments = await amendmentService.listAmendmentsByInquiry(id);

  return {
    ...inquiry,
    amendments,
  };
};

/**
 * Assigns (or reassigns) an inquiry to a single member. Overwrites any existing
 * assignee, taking the inquiry off every other user's list.
 *
 * @param {string} id - Inquiry id
 * @param {string} userId - Member id to assign the inquiry to
 * @returns {Promise<any>} The updated inquiry document
 */
const assignInquiry = async (id, userId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(messages.errors.invalidIdOrFormat, 400);
  }

  // Resolve the member snapshot — throws 400 (invalid id) / 404 (not found).
  const member = await memberService.getMemberById(userId);
  const assignedTo = {
    _id: String(member._id),
    fullName: member.fullName || '',
    firstName: member.firstName || '',
    lastName: member.lastName || '',
    employeeId: member.employeeId || '',
  };

  const inquiry = await Inquiry.findByIdAndUpdate(
    id,
    { $set: { assignedTo } },
    { new: true, runValidators: true }
  );

  if (!inquiry) {
    throw new AppError(messages.errors.inquiryNotFound, 404);
  }

  return inquiry;
};

/**
 * Updates an inquiry's status. The status value is validated upstream against
 * the allowed enum by the request middleware.
 *
 * @param {string} id - Inquiry id
 * @param {string} status - New status (one of INQUIRY_STATUS_VALUES)
 * @returns {Promise<any>} The updated inquiry document
 */
const updateInquiryStatus = async (id, status) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(messages.errors.invalidIdOrFormat, 400);
  }

  const inquiry = await Inquiry.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true, runValidators: true }
  );

  if (!inquiry) {
    throw new AppError(messages.errors.inquiryNotFound, 404);
  }

  return inquiry;
};

module.exports = {
  createInquiry,
  getAllInquiries,
  getInquiriesByPhone,
  getInquiryById,
  assignInquiry,
  updateInquiryStatus,
  getChecklistPriorityDefaults,
};
