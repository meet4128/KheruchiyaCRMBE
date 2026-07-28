const mongoose = require('mongoose');
const PaymentPlan = require('../models/PaymentPlan');
const Inquiry = require('../models/Inquiry');
const AppError = require('../utils/AppError');
const { messages } = require('../locales');

const assertValidObjectId = (id, message) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(message || messages.errors.invalidIdOrFormat, 400);
  }
};

const loadInquiry = async (inquiryId) => {
  assertValidObjectId(inquiryId, messages.errors.inquiryNotFound);
  const inquiry = await Inquiry.findById(inquiryId).lean();
  if (!inquiry) {
    throw new AppError(messages.errors.inquiryNotFound, 404);
  }
  return inquiry;
};

/**
 * Create or overwrite the payment plan for an inquiry (one plan per inquiry).
 * The full installment list is replaced on every save.
 *
 * @param {string} inquiryId
 * @param {object} payload validated payment-plan body
 * @param {string} userId
 */
const savePaymentPlan = async (inquiryId, payload, userId) => {
  const inquiry = await loadInquiry(inquiryId);

  const update = {
    inquiryId: inquiry._id,
    travelDate: payload.travelDate,
    bookingType: payload.bookingType,
    totalAmount: payload.totalAmount,
    numberOfInstallments: payload.numberOfInstallments,
    paymentReceivedTillNow: payload.paymentReceivedTillNow,
    installments: payload.installments,
    updatedBy: userId,
    // Any sales submit/update sends the plan (back) to the account team's unverified
    // queue; account verification is applied via the dedicated verify endpoint.
    verified: false,
    verifiedAt: null,
    verifiedBy: '',
  };

  const plan = await PaymentPlan.findOneAndUpdate(
    { inquiryId: inquiry._id },
    {
      $set: update,
      $setOnInsert: { createdBy: userId },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  return plan;
};

const getPaymentPlan = async (inquiryId) => {
  await loadInquiry(inquiryId);
  const plan = await PaymentPlan.findOne({ inquiryId }).lean();
  if (!plan) {
    throw new AppError(messages.errors.paymentPlanNotFound, 404);
  }
  return plan;
};

// Client-facing sort keys → real plan fields (allowlisted to avoid injection).
const UNVERIFIED_SORT_FIELDS = {
  submittedAt: 'updatedAt',
  amount: 'totalAmount',
  createdAt: 'createdAt',
};

/**
 * Cross-inquiry list of payment plans awaiting account-team verification (the "Unverified"
 * screen). One row per payment-plan (i.e. per inquiry) that is not yet verified
 * (`verified !== true`). A plan enters this queue whenever sales submits/updates it and
 * leaves once account verifies it. Each row is joined to its inquiry for the contact,
 * assignee and inquiry-number columns; installments carry the payment-proof uploads.
 *
 * @param {Object} queryParams validated query (page, limit, sort, search)
 * @returns {Promise<{ items: any[], page: number, limit: number, totalItems: number, totalPages: number }>}
 */
const getUnverifiedPayments = async (queryParams = {}) => {
  const { page = 1, limit = 10, sort = '-submittedAt', search } = queryParams;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const rawSort = String(sort || '').trim();
  const direction = rawSort.startsWith('-') ? -1 : 1;
  const field = rawSort.replace(/^-/, '').trim() || 'submittedAt';
  const sortKey = UNVERIFIED_SORT_FIELDS[field] || UNVERIFIED_SORT_FIELDS.submittedAt;
  const safeSort = { [sortKey]: direction, _id: 1 };

  const pipeline = [
    { $match: { verified: { $ne: true } } },
    {
      $lookup: {
        from: 'inquiries',
        localField: 'inquiryId',
        foreignField: '_id',
        as: 'inquiry',
      },
    },
    { $unwind: { path: '$inquiry', preserveNullAndEmptyArrays: true } },
  ];

  if (search) {
    // Escape regex metacharacters to prevent ReDoS, then partial/case-insensitive match.
    const sanitized = String(search)
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(sanitized, 'i');
    pipeline.push({
      $match: {
        $or: [
          { 'inquiry.fullName': rx },
          { 'inquiry.title': rx },
          { 'inquiry.referenceNumber.number': rx },
        ],
      },
    });
  }

  const projectStage = {
    $project: {
      _id: 0,
      paymentPlanId: '$_id',
      inquiryId: '$inquiryId',
      travelDate: '$travelDate',
      bookingType: '$bookingType',
      totalAmount: '$totalAmount',
      numberOfInstallments: '$numberOfInstallments',
      paymentReceivedTillNow: '$paymentReceivedTillNow',
      // Installments carry per-row amount/dueDate/receivedDate/mode and the
      // payment-proof upload ("Credit Account" column) for the details view.
      installments: '$installments',
      verified: '$verified',
      submittedAt: '$updatedAt',
      createdAt: '$createdAt',
      inquiry: {
        referenceNumber: '$inquiry.referenceNumber',
        title: '$inquiry.title',
      },
      contact: {
        fullName: '$inquiry.fullName',
        phoneNumber: '$inquiry.phoneNumber',
        airTicket: '$inquiry.airTicket',
      },
      assignedTo: '$inquiry.assignedTo',
    },
  };

  pipeline.push(
    { $sort: safeSort },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: limitNum }, projectStage],
        totalCount: [{ $count: 'count' }],
      },
    }
  );

  const [result] = await PaymentPlan.aggregate(pipeline);
  const items = result?.items || [];
  const totalItems = result?.totalCount?.[0]?.count || 0;
  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  return {
    items,
    page: pageNum,
    limit: limitNum,
    totalItems,
    totalPages,
  };
};

module.exports = {
  savePaymentPlan,
  getPaymentPlan,
  getUnverifiedPayments,
  loadInquiry,
};
