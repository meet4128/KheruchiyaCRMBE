const mongoose = require('mongoose');
const Member = require('../models/Member');
const AppError = require('../utils/AppError');
const { messages } = require('../locales');
const { MEMBER_INVITATION_STATUS } = require('../constants/memberInvitationStatus');
const { AUTH_TOKEN_PURPOSE } = require('../constants/authTokenPurpose');
const authTokenService = require('./authTokenService');
const emailService = require('./emailService');
const { log } = require('../utils/logger');

const TOKEN_VERSION_BUMP_EMPLOYMENT_STATUSES = new Set(['terminated', 'inactive']);

function buildInviteResponse({ rawToken, expiresAt, to, sent = true, devFallback = false }) {
  if (!sent) return { sent: false };
  return {
    sent: true,
    sentTo: to,
    expiresAt: expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt,
    devFallback,
    // rawToken is included ONLY in non-production for debugging; never in prod
    ...(process.env.NODE_ENV !== 'production' && rawToken ? { devToken: rawToken } : {}),
  };
}

/**
 * Issues a new invite token for a member, invalidating any prior open invite tokens,
 * sends the invite email, and stamps lastInviteSentAt.
 * Returns the invite descriptor (sent / sentTo / expiresAt) and the updated member doc.
 */
async function sendInviteToMember(member, { createdBy, appBaseUrl } = {}) {
  await authTokenService.invalidateOtherTokens({
    userId: member._id,
    purpose: AUTH_TOKEN_PURPOSE.INVITE,
  });

  const { rawToken, doc: tokenDoc } = await authTokenService.issueToken({
    userId: member._id,
    purpose: AUTH_TOKEN_PURPOSE.INVITE,
    createdBy,
  });

  const to = member.inviteEmail || member.personalEmail;
  const link = emailService.buildInviteLink(rawToken, appBaseUrl);

  let emailResult;
  try {
    emailResult = await emailService.sendInviteEmail({
      to,
      fullName: member.fullName,
      link,
      expiresAt: tokenDoc.expiresAt,
    });
  } catch (err) {
    log.error('invite.send.failed', err?.message || err);
    throw err;
  }

  member.lastInviteSentAt = new Date();
  await member.save();

  log.info(`invite.sent member=${member._id} to=${to}`);

  return {
    rawToken,
    invite: buildInviteResponse({
      rawToken,
      expiresAt: tokenDoc.expiresAt,
      to,
      sent: true,
      devFallback: emailResult.devFallback,
    }),
  };
}

const createMember = async (payload) => {
  const { employeeId, personalEmail, sendInvite = true, inviteEmail, ...rest } = payload;

  const existingId = await Member.findOne({ employeeId });
  if (existingId) {
    throw new AppError(messages.errors.employeeIdExists, 409);
  }

  const existingEmail = await Member.findOne({ personalEmail });
  if (existingEmail) {
    throw new AppError(messages.errors.personalEmailExists, 409);
  }

  const member = await Member.create({
    ...rest,
    employeeId,
    personalEmail,
    invitationStatus: MEMBER_INVITATION_STATUS.PENDING,
  });

  if (!sendInvite) {
    return { member, invite: { sent: false } };
  }

  // Attach inviteEmail transiently for downstream sendInviteToMember (not persisted)
  member.inviteEmail = inviteEmail || personalEmail;
  const { invite } = await sendInviteToMember(member, {
    createdBy: payload.createdBy,
    appBaseUrl: payload.appBaseUrl,
  });
  return { member, invite };
};

const updateMember = async (id, updates, options = {}) => {
  const { appBaseUrl } = options;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(messages.errors.invalidIdOrFormat, 400);
  }

  const existing = await Member.findById(id);
  if (!existing) {
    throw new AppError(messages.errors.memberNotFound, 404);
  }

  if (updates.employeeId && updates.employeeId !== existing.employeeId) {
    const dup = await Member.findOne({
      employeeId: updates.employeeId,
      _id: { $ne: id },
    });
    if (dup) {
      throw new AppError(messages.errors.employeeIdExists, 409);
    }
  }

  if (updates.personalEmail && updates.personalEmail !== existing.personalEmail) {
    const dup = await Member.findOne({
      personalEmail: updates.personalEmail,
      _id: { $ne: id },
    });
    if (dup) {
      throw new AppError(messages.errors.personalEmailExists, 409);
    }
  }

  const emailChanged = updates.personalEmail && updates.personalEmail !== existing.personalEmail;
  const employmentChanged =
    updates.employmentStatus && updates.employmentStatus !== existing.employmentStatus;
  const employmentNowBlocked =
    employmentChanged &&
    TOKEN_VERSION_BUMP_EMPLOYMENT_STATUSES.has(String(updates.employmentStatus).toLowerCase());

  const wasPending = existing.invitationStatus === MEMBER_INVITATION_STATUS.PENDING;
  const wasActive = existing.invitationStatus === MEMBER_INVITATION_STATUS.ACTIVE;

  const setOps = { ...updates };
  const incOps = {};

  // PATCH side effects (passwordflow.md §7 Phase 0)
  if (emailChanged && wasActive) {
    incOps.tokenVersion = (incOps.tokenVersion || 0) + 1;
  }
  if (employmentNowBlocked) {
    incOps.tokenVersion = (incOps.tokenVersion || 0) + 1;
  }

  const update = { $set: setOps };
  if (Object.keys(incOps).length > 0) update.$inc = incOps;

  let member = await Member.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });

  // For pending members whose email changed: invalidate old invites and auto-resend to the new address
  if (emailChanged && wasPending) {
    await authTokenService.invalidateOtherTokens({
      userId: member._id,
      purpose: AUTH_TOKEN_PURPOSE.INVITE,
    });
    member.inviteEmail = updates.personalEmail;
    try {
      await sendInviteToMember(member, { appBaseUrl });
      member = await Member.findById(id);
    } catch (err) {
      log.error('invite.autoresend.failed', err?.message || err);
    }
  }

  if (emailChanged && wasActive) {
    log.info(`auth.tokenVersion.bumped reason=emailChanged member=${member._id}`);
  }
  if (employmentNowBlocked) {
    log.info(
      `auth.tokenVersion.bumped reason=employmentStatus=${updates.employmentStatus} member=${member._id}`
    );
  }

  return member;
};

const resendInvitation = async (id, { createdBy, appBaseUrl } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(messages.errors.invalidIdOrFormat, 400);
  }
  const member = await Member.findById(id);
  if (!member) {
    throw new AppError(messages.errors.memberNotFound, 404);
  }
  if (member.invitationStatus !== MEMBER_INVITATION_STATUS.PENDING) {
    throw new AppError(messages.auth.inviteAlreadyActive, 409);
  }
  const { invite } = await sendInviteToMember(member, { createdBy, appBaseUrl });
  log.info(`invite.resent member=${member._id} by=${createdBy || 'unknown'}`);
  return { member, invite };
};

const deleteMember = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(messages.errors.invalidIdOrFormat, 400);
  }

  const member = await Member.findByIdAndDelete(id);
  if (!member) {
    throw new AppError(messages.errors.memberNotFound, 404);
  }

  return member;
};

const getMemberById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(messages.errors.invalidIdOrFormat, 400);
  }

  const member = await Member.findById(id).lean();
  if (!member) {
    throw new AppError(messages.errors.memberNotFound, 404);
  }

  return member;
};

const ALLOWED_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'fullName',
  'personalEmail',
  'employeeId',
  'designation',
  'employmentStatus',
  'city',
];

const getMembers = async (queryParams = {}) => {
  const { page = 1, limit = 10, sort = '-createdAt', employmentStatus, city, search } = queryParams;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 10, 1);
  const skip = (pageNum - 1) * limitNum;

  const rawSort = String(sort || '').trim();
  const direction = rawSort.startsWith('-') ? -1 : 1;
  const field = rawSort.replace(/^-/, '').trim() || 'createdAt';
  const safeSort = ALLOWED_SORT_FIELDS.includes(field) ? { [field]: direction } : { createdAt: -1 };

  const filter = {};
  if (employmentStatus) {
    filter.employmentStatus = employmentStatus;
  }
  if (city) {
    filter.city = city;
  }
  if (search) {
    const sanitized = String(search)
      .slice(0, 100)
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(sanitized, 'i');
    filter.$or = [
      { fullName: re },
      { personalEmail: re },
      { employeeId: re },
      { 'phoneNumber.number': re },
      { 'officePhoneNumber.number': re },
    ];
  }

  const query = Member.find(filter).skip(skip).limit(limitNum).sort(safeSort);
  const [items, totalItems] = await Promise.all([query.exec(), Member.countDocuments(filter)]);
  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  return {
    items,
    page: pageNum,
    limit: limitNum,
    totalItems,
    totalPages,
  };
};

const DIRECTORY_SELECT =
  '_id fullName firstName lastName employeeId designation employmentStatus departmentRoles officePhoneNumber phoneNumber personalEmail city';

const escapeRegex = (value) =>
  String(value)
    .slice(0, 64)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Read-only member list for sales/purchase team pickers (no document URLs or home PII).
 * @param {{ department: string, role?: string, employmentStatus?: string, page?: number, limit?: number, search?: string }} queryParams
 */
const getMembersDirectory = async (queryParams = {}) => {
  const {
    department,
    role,
    employmentStatus = 'active',
    page = 1,
    limit = 50,
    search,
  } = queryParams;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const deptRe = new RegExp(`^${escapeRegex(department)}$`, 'i');
  const elemMatch = { department: deptRe };
  if (role) {
    elemMatch.role = new RegExp(`^${escapeRegex(role)}$`, 'i');
  }

  const filter = {
    departmentRoles: { $elemMatch: elemMatch },
  };
  if (employmentStatus) {
    filter.employmentStatus = employmentStatus;
  }
  if (search) {
    const sanitized = escapeRegex(search);
    const re = new RegExp(sanitized, 'i');
    filter.$or = [
      { fullName: re },
      { personalEmail: re },
      { employeeId: re },
      { designation: re },
      { 'phoneNumber.number': re },
      { 'officePhoneNumber.number': re },
    ];
  }

  const query = Member.find(filter)
    .select(DIRECTORY_SELECT)
    .skip(skip)
    .limit(limitNum)
    .sort({ fullName: 1 })
    .lean();

  const [items, totalItems] = await Promise.all([query.exec(), Member.countDocuments(filter)]);
  const totalPages = Math.ceil(totalItems / limitNum) || 1;

  return {
    items,
    department,
    role: role || null,
    page: pageNum,
    limit: limitNum,
    totalItems,
    totalPages,
  };
};

module.exports = {
  createMember,
  updateMember,
  resendInvitation,
  deleteMember,
  getMemberById,
  getMembers,
  getMembersDirectory,
};
