const mongoose = require('mongoose');
const PaymentPlan = require('../models/PaymentPlan');
const Inquiry = require('../models/Inquiry');
const AppError = require('../utils/AppError');
const { PAYMENT_VERIFICATION_STATUS } = require('../constants/paymentVerificationStatus');
const { messages } = require('../locales');

const assertValidObjectId = (id, message) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(message || messages.errors.invalidIdOrFormat, 400);
  }
};

/** True when every installment has been verified (empty list is not "verified"). */
const areAllInstallmentsVerified = (installments = []) =>
  installments.length > 0 &&
  installments.every((i) => i.verificationStatus === PAYMENT_VERIFICATION_STATUS.VERIFIED);

// Material fields of an installment (verification metadata excluded). A change to
// any of these on a VERIFIED row is rejected — a verified installment is locked.
const normalizeDate = (v) => (v ? new Date(v).getTime() : null);
const normalizeStr = (v) => (v === undefined || v === null ? '' : String(v));

const installmentMaterialChanged = (current, incoming) =>
  Number(current.amount) !== Number(incoming.amount) ||
  normalizeDate(current.dueDate) !== normalizeDate(incoming.dueDate) ||
  normalizeDate(current.receivedDate) !== normalizeDate(incoming.receivedDate) ||
  normalizeStr(current.mode) !== normalizeStr(incoming.mode) ||
  normalizeStr(current.status) !== normalizeStr(incoming.status) ||
  normalizeStr(current.paymentProofUrl) !== normalizeStr(incoming.paymentProofUrl);

/**
 * Merges the incoming installment list onto the stored one, preserving each row's
 * stable paymentId (_id) and its verification state:
 *  - VERIFIED rows are locked: they must be re-sent unchanged, else 409.
 *  - PENDING rows are updated in place and stay PENDING.
 *  - Rows without a known _id are added fresh as PENDING.
 * Removing a VERIFIED row (omitting its _id from the payload) is also a 409.
 */
const mergeInstallments = (existingInstallments = [], incomingInstallments = []) => {
  const existingById = new Map(existingInstallments.map((i) => [String(i._id), i]));
  const seenIds = new Set();

  const merged = incomingInstallments.map((incoming) => {
    const id = incoming._id ? String(incoming._id) : null;
    const current = id ? existingById.get(id) : null;

    if (current) {
      seenIds.add(id);
      if (current.verificationStatus === PAYMENT_VERIFICATION_STATUS.VERIFIED) {
        if (installmentMaterialChanged(current, incoming)) {
          throw new AppError(messages.errors.verifiedInstallmentLocked, 409);
        }
        // Locked and unchanged — keep the stored row verbatim (status/audit intact).
        return current;
      }
      // Pending existing row — apply the sales edits, keep id + PENDING state.
      return {
        _id: current._id,
        amount: incoming.amount,
        dueDate: incoming.dueDate,
        receivedDate: incoming.receivedDate,
        mode: incoming.mode,
        status: incoming.status,
        paymentProofUrl: incoming.paymentProofUrl,
        verificationStatus: PAYMENT_VERIFICATION_STATUS.PENDING,
      };
    }

    // New row (no id, or an id we don't recognise) — fresh PENDING installment.
    return {
      amount: incoming.amount,
      dueDate: incoming.dueDate,
      receivedDate: incoming.receivedDate,
      mode: incoming.mode,
      status: incoming.status,
      paymentProofUrl: incoming.paymentProofUrl,
      verificationStatus: PAYMENT_VERIFICATION_STATUS.PENDING,
    };
  });

  // A verified row that the payload dropped is a forbidden removal.
  for (const [id, inst] of existingById) {
    if (inst.verificationStatus === PAYMENT_VERIFICATION_STATUS.VERIFIED && !seenIds.has(id)) {
      throw new AppError(messages.errors.verifiedInstallmentLocked, 409);
    }
  }

  return merged;
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
 * Create or update the payment plan for an inquiry (one plan per inquiry).
 *
 * Installments are merged per-row rather than wholesale-replaced: each keeps its
 * stable paymentId (_id) and verification state. VERIFIED installments are locked
 * (editing/removing one is a 409); PENDING and new rows are saved as PENDING.
 * The plan-level `verified` roll-up is derived from the merged installments.
 *
 * @param {string} inquiryId
 * @param {object} payload validated payment-plan body
 * @param {string} userId
 */
const savePaymentPlan = async (inquiryId, payload, userId) => {
  const inquiry = await loadInquiry(inquiryId);

  const existing = await PaymentPlan.findOne({ inquiryId: inquiry._id }).lean();
  const installments = mergeInstallments(existing?.installments, payload.installments);
  const verified = areAllInstallmentsVerified(installments);

  const update = {
    inquiryId: inquiry._id,
    travelDate: payload.travelDate,
    bookingType: payload.bookingType,
    totalAmount: payload.totalAmount,
    numberOfInstallments: payload.numberOfInstallments,
    paymentReceivedTillNow: payload.paymentReceivedTillNow,
    installments,
    updatedBy: userId,
    // Roll-up derived from the merged installments (see areAllInstallmentsVerified).
    verified,
    verifiedAt: verified ? existing?.verifiedAt || new Date() : null,
    verifiedBy: verified ? existing?.verifiedBy || userId : '',
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

/**
 * Account-team verification of an inquiry's payment plan, applied to EVERY
 * installment at once ("verify all" / "un-verify all"). Verifying is the gate
 * sales needs before an amendment can be marked as won; un-verifying sends the
 * plan back into the account "Unverified" queue. For a single row use
 * verifyInstallment instead.
 *
 * @param {string} inquiryId
 * @param {boolean} verified
 * @param {string} userId account-role user performing the action
 */
const verifyPaymentPlan = async (inquiryId, verified, userId) => {
  await loadInquiry(inquiryId);

  const plan = await PaymentPlan.findOne({ inquiryId });
  if (!plan) {
    throw new AppError(messages.errors.paymentPlanNotFound, 404);
  }

  const now = new Date();
  plan.installments.forEach((inst) => {
    inst.verificationStatus = verified
      ? PAYMENT_VERIFICATION_STATUS.VERIFIED
      : PAYMENT_VERIFICATION_STATUS.PENDING;
    inst.verifiedAt = verified ? now : undefined;
    inst.verifiedBy = verified ? userId : '';
  });

  const allVerified = areAllInstallmentsVerified(plan.installments);
  plan.verified = allVerified;
  plan.verifiedAt = allVerified ? now : null;
  plan.verifiedBy = allVerified ? userId : '';

  await plan.save();
  return plan.toObject();
};

/**
 * Account-team verification of a SINGLE installment (paymentId = installment _id).
 * Verifying locks that installment from further edits; un-verifying returns it to
 * PENDING. The plan-level `verified` roll-up is recomputed from all installments.
 *
 * @param {string} inquiryId
 * @param {string} installmentId the installment's _id (paymentId)
 * @param {boolean} verified
 * @param {string} userId account-role user performing the action
 */
const verifyInstallment = async (inquiryId, installmentId, verified, userId) => {
  await loadInquiry(inquiryId);
  assertValidObjectId(installmentId, messages.errors.installmentNotFound);

  const plan = await PaymentPlan.findOne({ inquiryId });
  if (!plan) {
    throw new AppError(messages.errors.paymentPlanNotFound, 404);
  }

  const installment = plan.installments.id(installmentId);
  if (!installment) {
    throw new AppError(messages.errors.installmentNotFound, 404);
  }

  const now = new Date();
  installment.verificationStatus = verified
    ? PAYMENT_VERIFICATION_STATUS.VERIFIED
    : PAYMENT_VERIFICATION_STATUS.PENDING;
  installment.verifiedAt = verified ? now : undefined;
  installment.verifiedBy = verified ? userId : '';

  const allVerified = areAllInstallmentsVerified(plan.installments);
  plan.verified = allVerified;
  plan.verifiedAt = allVerified ? now : null;
  plan.verifiedBy = allVerified ? userId : '';

  await plan.save();
  return plan.toObject();
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
    // A plan needs attention while any of its installments is still PENDING.
    { $match: { 'installments.verificationStatus': PAYMENT_VERIFICATION_STATUS.PENDING } },
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
  verifyPaymentPlan,
  verifyInstallment,
  getUnverifiedPayments,
  loadInquiry,
};
