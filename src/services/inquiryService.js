const mongoose = require('mongoose');
const Inquiry = require('../models/Inquiry');
const amendmentService = require('./amendmentService');
const AppError = require('../utils/AppError');
const { INQUIRY_STATUS_VALUES } = require('../constants/inquiryStatus');
const { messages } = require('../locales');

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
  const { referenceNumber } = payload;

  const existing = await Inquiry.findOne({
    'referenceNumber.countryCode': referenceNumber.countryCode,
    'referenceNumber.number': referenceNumber.number,
  });

  if (existing) {
    throw new AppError(messages.errors.referenceNumberExists, 409);
  }

  const inquiry = await Inquiry.create(payload);
  return inquiry;
};

/**
 * Builds a Mongoose query for listing inquiries with filters, search, pagination, and sorting.
 *
 * @param {Object} queryParams - Raw query params from Express (req.query)
 * @returns {Promise<{ items: any[], page: number, limit: number, totalItems: number, totalPages: number }>}
 */
const getAllInquiries = async (queryParams = {}) => {
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

  const query = Inquiry.find(filter).skip(skip).limit(limitNum).sort(safeSort);

  const [items, totalItems] = await Promise.all([query.exec(), Inquiry.countDocuments(filter)]);

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

module.exports = { createInquiry, getAllInquiries, getInquiryById };
