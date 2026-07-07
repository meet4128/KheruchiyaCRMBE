const mongoose = require('mongoose');
const Amendment = require('../models/Amendment');
const AmendmentMessage = require('../models/AmendmentMessage');
const AmendmentNote = require('../models/AmendmentNote');
const AmendmentActiveSession = require('../models/AmendmentActiveSession');
const Inquiry = require('../models/Inquiry');
const { ACTION_TO_STATUS } = require('../constants/amendmentAction');
const { AMENDMENT_STATUS } = require('../constants/amendmentStatus');
const generateAmendmentId = require('../utils/generateAmendmentId');
const AppError = require('../utils/AppError');
const { messages } = require('../locales');

/** Allowed sort fields to prevent query injection on amendment search */
const AMENDMENT_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'processedAt',
  'amendmentId',
  'amendmentType',
  'status',
  'amountCharged',
];

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

const phoneToPeer = (phoneNumber) => {
  if (!phoneNumber?.number) return null;
  const cc = String(phoneNumber.countryCode || '').replace(/\D/g, '');
  const num = String(phoneNumber.number || '').replace(/\D/g, '');
  if (!num) return null;
  return `${cc}${num}`.replace(/^\+/, '');
};

/**
 * @param {string} inquiryId
 * @param {{ action: string, amendmentType: string, amountCharged?: number, sessionId?: string, notes?: Array<{ text: string }> }} payload
 * @param {string} userId
 */
const finalizeAmendment = async (inquiryId, payload, userId) => {
  const inquiry = await loadInquiry(inquiryId);
  const status = ACTION_TO_STATUS[payload.action];
  if (!status) {
    throw new AppError(messages.validation.amendment.invalidAction, 422);
  }

  if (status === AMENDMENT_STATUS.COMPLETED) {
    const amount = payload.amountCharged;
    if (amount == null || Number.isNaN(Number(amount)) || Number(amount) < 0) {
      throw new AppError(messages.validation.amendment.amountChargedRequired, 422);
    }
  }

  const businessId = generateAmendmentId(payload.amendmentType);
  const now = new Date();
  const sessionId = payload.sessionId ? String(payload.sessionId).trim() : undefined;

  const amendment = await Amendment.create({
    inquiryId: inquiry._id,
    amendmentId: businessId,
    amendmentType: payload.amendmentType,
    status,
    amountCharged:
      status === AMENDMENT_STATUS.COMPLETED ? Number(payload.amountCharged) : undefined,
    sessionId,
    createdBy: userId,
    processedAt: now,
    chatLockedAt: now,
  });

  if (sessionId) {
    await AmendmentMessage.updateMany(
      { inquiryId: inquiry._id, sessionId, amendmentId: { $in: [null, ''] } },
      { $set: { amendmentId: businessId } }
    );
    await AmendmentNote.updateMany(
      { inquiryId: inquiry._id, sessionId, amendmentId: { $in: [null, ''] } },
      { $set: { amendmentId: businessId } }
    );
    await AmendmentActiveSession.updateOne({ sessionId }, { $set: { finalizedAt: now } });
  }

  if (Array.isArray(payload.notes) && payload.notes.length > 0) {
    const noteDocs = payload.notes.map((n) => ({
      inquiryId: inquiry._id,
      sessionId,
      amendmentId: businessId,
      text: n.text,
      createdBy: userId,
    }));
    await AmendmentNote.insertMany(noteDocs);
  }

  return amendment.toObject();
};

const listAmendmentsByInquiry = async (inquiryId) => {
  await loadInquiry(inquiryId);
  return Amendment.find({ inquiryId }).sort({ createdAt: -1 }).lean();
};

const assertAmendmentExists = async (inquiryId, amendmentId) => {
  await loadInquiry(inquiryId);
  const exists = await Amendment.exists({ inquiryId, amendmentId });
  if (!exists) {
    throw new AppError(messages.errors.amendmentNotFound, 404);
  }
};

const getAmendment = async (inquiryId, amendmentId) => {
  await loadInquiry(inquiryId);
  const amendment = await Amendment.findOne({ inquiryId, amendmentId }).lean();
  if (!amendment) {
    throw new AppError(messages.errors.amendmentNotFound, 404);
  }
  return amendment;
};

const getAmendmentMessages = async (inquiryId, amendmentId, queryParams = {}) => {
  await assertAmendmentExists(inquiryId, amendmentId);
  const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 50, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { inquiryId, amendmentId };
  const [items, totalItems] = await Promise.all([
    AmendmentMessage.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
    AmendmentMessage.countDocuments(filter),
  ]);

  return {
    items,
    amendmentId,
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit) || 1,
  };
};

const getSessionMessages = async (inquiryId, sessionId, queryParams = {}) => {
  await loadInquiry(inquiryId);
  const active = await AmendmentActiveSession.findOne({ sessionId }).lean();
  if (!active || String(active.inquiryId) !== String(inquiryId) || active.finalizedAt) {
    throw new AppError(messages.errors.amendmentSessionNotFound, 404);
  }

  const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 50, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { inquiryId, sessionId, amendmentId: { $in: [null, ''] } };
  const [items, totalItems] = await Promise.all([
    AmendmentMessage.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
    AmendmentMessage.countDocuments(filter),
  ]);

  return {
    items,
    sessionId,
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit) || 1,
  };
};

const getAmendmentNotes = async (inquiryId, amendmentId) => {
  await assertAmendmentExists(inquiryId, amendmentId);
  return AmendmentNote.find({ inquiryId, amendmentId }).sort({ createdAt: 1 }).lean();
};

/**
 * @param {string} inquiryId
 * @param {string} sessionId
 * @param {string} text
 * @param {string} userId
 */
const addSessionNote = async (inquiryId, sessionId, text, userId) => {
  const inquiry = await loadInquiry(inquiryId);
  const peerPhone = phoneToPeer(inquiry.phoneNumber);
  await registerActiveSession(inquiryId, sessionId, peerPhone, userId);

  const note = await AmendmentNote.create({
    inquiryId,
    sessionId,
    text,
    createdBy: userId,
  });
  return note.toObject();
};

/**
 * Register or refresh active session for WhatsApp routing.
 */
const registerActiveSession = async (inquiryId, sessionId, peerPhone, userId) => {
  await loadInquiry(inquiryId);
  const update = {
    inquiryId,
    sessionId,
    createdBy: userId,
    finalizedAt: null,
  };
  if (peerPhone) {
    update.peerPhone = peerPhone;
  }
  const doc = await AmendmentActiveSession.findOneAndUpdate(
    { sessionId },
    { $set: update },
    {
      upsert: true,
      new: true,
    }
  );
  return doc.toObject();
};

const findActiveSessionByPeer = async (peerPhone) => {
  if (!peerPhone) return null;
  return AmendmentActiveSession.findOne({
    peerPhone,
    finalizedAt: null,
  })
    .sort({ updatedAt: -1 })
    .lean();
};

/**
 * @param {object} messageFields
 */
const saveSessionMessage = async (messageFields) => {
  if (messageFields.wamid) {
    const existing = await AmendmentMessage.findOne({ wamid: messageFields.wamid }).lean();
    if (existing) return existing;
  }
  const doc = await AmendmentMessage.create(messageFields);
  return doc.toObject();
};

/**
 * Searches amendments across all inquiries with optional filters, pagination and sorting.
 * Only fields that exist on the Amendment model are supported; unmodeled UI fields
 * (Journey/Fare/Channel Type, Booking ID, etc.) are intentionally not filterable.
 *
 * @param {Object} queryParams - Validated query params from req.query
 * @returns {Promise<{ items: any[], page: number, limit: number, totalItems: number, totalPages: number }>}
 */
const searchAmendments = async (queryParams = {}) => {
  const {
    page = 1,
    limit = 10,
    amendmentId,
    amendmentType,
    status,
    processedFrom,
    processedTo,
    createdFrom,
    createdTo,
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
  const safeSort = AMENDMENT_SORT_FIELDS.includes(field)
    ? { [field]: direction }
    : { createdAt: -1 };

  const filter = {};

  if (amendmentType) {
    filter.amendmentType = amendmentType;
  }

  if (status) {
    filter.status = status;
  }

  // amendmentId: partial, case-insensitive match (escape regex chars to prevent ReDoS)
  const idTerm = amendmentId || search;
  if (idTerm) {
    const sanitized = String(idTerm)
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.amendmentId = new RegExp(sanitized, 'i');
  }

  // processedAt range
  if (processedFrom || processedTo) {
    filter.processedAt = {};
    if (processedFrom) filter.processedAt.$gte = new Date(processedFrom);
    if (processedTo) filter.processedAt.$lte = new Date(processedTo);
  }

  // createdAt range (the "Generated Time" / From–To Date column)
  if (createdFrom || createdTo) {
    filter.createdAt = {};
    if (createdFrom) filter.createdAt.$gte = new Date(createdFrom);
    if (createdTo) filter.createdAt.$lte = new Date(createdTo);
  }

  const query = Amendment.find(filter).skip(skip).limit(limitNum).sort(safeSort).lean();

  const [items, totalItems] = await Promise.all([query.exec(), Amendment.countDocuments(filter)]);

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
  finalizeAmendment,
  searchAmendments,
  listAmendmentsByInquiry,
  getAmendment,
  getAmendmentMessages,
  getSessionMessages,
  getAmendmentNotes,
  addSessionNote,
  registerActiveSession,
  findActiveSessionByPeer,
  saveSessionMessage,
  loadInquiry,
  phoneToPeer,
};
