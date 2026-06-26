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

module.exports = {
  savePaymentPlan,
  getPaymentPlan,
  loadInquiry,
};
