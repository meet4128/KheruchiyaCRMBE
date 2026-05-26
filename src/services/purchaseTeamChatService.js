const mongoose = require('mongoose');
const PurchaseTeamChat = require('../models/PurchaseTeamChat');
const PurchaseTeamChatMessage = require('../models/PurchaseTeamChatMessage');
const Member = require('../models/Member');
const Inquiry = require('../models/Inquiry');
const { PURCHASE_CHAT_SENDER_ROLE } = require('../constants/purchaseChatSenderRole');
const AppError = require('../utils/AppError');
const { messages } = require('../locales');

const PURCHASE_DEPARTMENT_RE = /^purchase$/i;

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

const memberHasPurchaseDepartment = (member) =>
  Array.isArray(member?.departmentRoles) &&
  member.departmentRoles.some((r) => PURCHASE_DEPARTMENT_RE.test(String(r.department || '')));

const loadPurchaseTeamMember = async (purchaseTeamMemberId) => {
  assertValidObjectId(purchaseTeamMemberId, messages.errors.memberNotFound);
  const member = await Member.findById(purchaseTeamMemberId).lean();
  if (!member || !memberHasPurchaseDepartment(member)) {
    throw new AppError(messages.errors.purchaseTeamMemberNotFound, 404);
  }
  return member;
};

/**
 * Links JWT user to a Member row (employeeId or personalEmail).
 */
const findMemberForAuthUser = async (user) => {
  if (!user?.id && !user?.email) return null;
  const email = user.email ? String(user.email).toLowerCase() : null;
  const filter = {
    $or: [{ employeeId: user.id }, ...(email ? [{ personalEmail: email }] : [])],
  };
  return Member.findOne(filter).lean();
};

const normalizeJwtRole = (role) => String(role || '').toLowerCase();

const mapSenderRole = (jwtRole) => {
  const r = normalizeJwtRole(jwtRole);
  if (r === PURCHASE_CHAT_SENDER_ROLE.ADMIN) return PURCHASE_CHAT_SENDER_ROLE.ADMIN;
  if (r === PURCHASE_CHAT_SENDER_ROLE.PURCHASE) return PURCHASE_CHAT_SENDER_ROLE.PURCHASE;
  if (r === PURCHASE_CHAT_SENDER_ROLE.SALES) return PURCHASE_CHAT_SENDER_ROLE.SALES;
  return null;
};

const assertCanAccessThread = async (user, purchaseTeamMemberId) => {
  const role = normalizeJwtRole(user?.role);
  if (role === 'admin' || role === 'sales') {
    return;
  }
  if (role === 'purchase') {
    const member = await findMemberForAuthUser(user);
    if (member && String(member._id) === String(purchaseTeamMemberId)) {
      return;
    }
    throw new AppError(messages.auth.insufficientRole, 403);
  }
  throw new AppError(messages.auth.insufficientRole, 403);
};

const getOrCreateThread = async (inquiryId, purchaseTeamMemberId, userId) => {
  await loadInquiry(inquiryId);
  await loadPurchaseTeamMember(purchaseTeamMemberId);

  const thread = await PurchaseTeamChat.findOneAndUpdate(
    { inquiryId, purchaseTeamMemberId },
    {
      $setOnInsert: {
        inquiryId,
        purchaseTeamMemberId,
        createdBy: userId,
        lastMessageAt: new Date(),
        lastMessagePreview: '',
      },
    },
    { upsert: true, new: true }
  ).lean();

  return thread;
};

const listThreadsByInquiry = async (inquiryId, user, queryParams = {}) => {
  await loadInquiry(inquiryId);

  const filter = { inquiryId };
  const role = normalizeJwtRole(user?.role);

  if (role === 'purchase') {
    const member = await findMemberForAuthUser(user);
    if (!member) {
      throw new AppError(messages.auth.insufficientRole, 403);
    }
    filter.purchaseTeamMemberId = member._id;
  }

  if (queryParams.purchaseTeamMemberId) {
    assertValidObjectId(queryParams.purchaseTeamMemberId);
    if (role === 'purchase') {
      const member = await findMemberForAuthUser(user);
      if (!member || String(member._id) !== String(queryParams.purchaseTeamMemberId)) {
        throw new AppError(messages.auth.insufficientRole, 403);
      }
    }
    filter.purchaseTeamMemberId = queryParams.purchaseTeamMemberId;
  }

  const threads = await PurchaseTeamChat.find(filter)
    .sort({ lastMessageAt: -1 })
    .populate(
      'purchaseTeamMemberId',
      '_id fullName employeeId designation departmentRoles officePhoneNumber personalEmail'
    )
    .lean();

  return { items: threads, inquiryId };
};

const getMessages = async (inquiryId, purchaseTeamMemberId, user, queryParams = {}) => {
  await loadInquiry(inquiryId);
  await loadPurchaseTeamMember(purchaseTeamMemberId);
  await assertCanAccessThread(user, purchaseTeamMemberId);

  await getOrCreateThread(inquiryId, purchaseTeamMemberId, user.id);

  const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 50, 1), 100);
  const skip = (page - 1) * limit;

  const filter = { inquiryId, purchaseTeamMemberId };
  const [items, totalItems] = await Promise.all([
    PurchaseTeamChatMessage.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
    PurchaseTeamChatMessage.countDocuments(filter),
  ]);

  return {
    items,
    inquiryId,
    purchaseTeamMemberId,
    page,
    limit,
    totalItems,
    totalPages: Math.ceil(totalItems / limit) || 1,
  };
};

const messagePreview = ({ type, text, fileName }) => {
  if (type === 'document') return (fileName || text || '[Document]').slice(0, 200);
  if (type === 'image') return (text || '[Image]').slice(0, 200);
  return String(text || '')
    .trim()
    .slice(0, 200);
};

const sendMessage = async (inquiryId, purchaseTeamMemberId, payload, user) => {
  await loadInquiry(inquiryId);
  await loadPurchaseTeamMember(purchaseTeamMemberId);
  await assertCanAccessThread(user, purchaseTeamMemberId);

  const senderRole = mapSenderRole(user.role);
  if (!senderRole) {
    throw new AppError(messages.auth.insufficientRole, 403);
  }

  const type = payload.type || 'text';
  const text = payload.text || '';
  const preview = messagePreview({ type, text, fileName: payload.fileName });

  const [message] = await Promise.all([
    PurchaseTeamChatMessage.create({
      inquiryId,
      purchaseTeamMemberId,
      senderUserId: user.id,
      senderRole,
      type,
      text,
      mediaUrl: payload.mediaUrl,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
    }),
    PurchaseTeamChat.findOneAndUpdate(
      { inquiryId, purchaseTeamMemberId },
      {
        $set: {
          lastMessageAt: new Date(),
          lastMessagePreview: preview,
        },
        $setOnInsert: {
          inquiryId,
          purchaseTeamMemberId,
          createdBy: user.id,
        },
      },
      { upsert: true, new: true }
    ),
  ]);

  return message.toObject();
};

module.exports = {
  getOrCreateThread,
  listThreadsByInquiry,
  getMessages,
  sendMessage,
  loadPurchaseTeamMember,
  findMemberForAuthUser,
  assertCanAccessThread,
  loadInquiry,
};
