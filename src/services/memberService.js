const mongoose = require('mongoose');
const Member = require('../models/Member');
const AppError = require('../utils/AppError');
const { messages } = require('../locales');

const createMember = async (payload) => {
  const { employeeId, personalEmail } = payload;

  const existingId = await Member.findOne({ employeeId });
  if (existingId) {
    throw new AppError(messages.errors.employeeIdExists, 409);
  }

  const existingEmail = await Member.findOne({ personalEmail });
  if (existingEmail) {
    throw new AppError(messages.errors.personalEmailExists, 409);
  }

  const member = await Member.create(payload);
  return member;
};

const updateMember = async (id, updates) => {
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

  const member = await Member.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  return member;
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

module.exports = { createMember, updateMember, deleteMember, getMembers, getMembersDirectory };
