const Inquiry = require('../models/Inquiry');
const AppError = require('../utils/AppError');

const createInquiry = async (payload) => {
  const { referenceNumber } = payload;

  const existing = await Inquiry.findOne({
    'referenceNumber.countryCode': referenceNumber.countryCode,
    'referenceNumber.number': referenceNumber.number,
  });

  if (existing) {
    throw new AppError('Reference number already exists', 409);
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

  // Base filter
  const filter = {};

  if (typeOfBooking) {
    filter.typeOfBooking = typeOfBooking;
  }

  if (typeOfClient) {
    filter.typeOfClient = typeOfClient;
  }

  if (status) {
    filter.status = status;
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { fullName: searchRegex },
      { 'phoneNumber.number': searchRegex },
    ];
  }

  const query = Inquiry.find(filter).skip(skip).limit(limitNum).sort(sort);

  const [items, totalItems] = await Promise.all([
    query.exec(),
    Inquiry.countDocuments(filter),
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

module.exports = { createInquiry, getAllInquiries };
