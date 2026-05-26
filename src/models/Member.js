const mongoose = require('mongoose');
const { MEMBER_GENDER_VALUES } = require('../constants/memberGender');
const { MEMBER_MARITAL_STATUS_VALUES } = require('../constants/memberMaritalStatus');
const { MEMBER_EMPLOYMENT_STATUS_VALUES } = require('../constants/memberEmploymentStatus');
const {
  MEMBER_INVITATION_STATUS,
  MEMBER_INVITATION_STATUS_VALUES,
} = require('../constants/memberInvitationStatus');
const { messages } = require('../locales');

/** Phone / office line: { countryCode, number } — same shape as Inquiry */
const contactNumberSchema = new mongoose.Schema(
  {
    countryCode: { type: String, required: true, trim: true },
    number: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const departmentRoleSchema = new mongoose.Schema(
  {
    department: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const emptyToUndefined = (v) => (v === '' || v === null ? undefined : v);

const memberSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    personalEmail: { type: String, required: true, trim: true, lowercase: true },
    phoneNumber: { type: contactNumberSchema, required: true },
    homePhoneNumber: { type: contactNumberSchema, required: true },
    dateOfBirth: { type: Date, set: emptyToUndefined },
    gender: {
      type: String,
      enum: {
        values: MEMBER_GENDER_VALUES,
        message: 'Invalid gender',
      },
      set: emptyToUndefined,
    },
    maritalStatus: {
      type: String,
      enum: {
        values: MEMBER_MARITAL_STATUS_VALUES,
        message: 'Invalid marital status',
      },
      set: emptyToUndefined,
    },
    dateOfAnniversary: { type: Date, set: emptyToUndefined },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true, set: emptyToUndefined },
    zipCode: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },

    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    employeeId: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    employmentStatus: {
      type: String,
      required: true,
      enum: MEMBER_EMPLOYMENT_STATUS_VALUES,
    },
    dateOfJoining: { type: Date, required: true },
    departmentRoles: {
      type: [departmentRoleSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 1,
        message: messages.model.memberDepartmentRolesRequired,
      },
    },
    officePhoneNumber: { type: contactNumberSchema, required: true },

    aadharDocumentUrl: { type: String, trim: true, set: emptyToUndefined },
    panDocumentUrl: { type: String, trim: true, set: emptyToUndefined },
    cancelChequeDocumentUrl: { type: String, trim: true, set: emptyToUndefined },

    // Auth / invitation lifecycle — managed by backend; never accepted from client payloads
    passwordHash: { type: String, select: false },
    invitationStatus: {
      type: String,
      enum: MEMBER_INVITATION_STATUS_VALUES,
      default: MEMBER_INVITATION_STATUS.PENDING,
      required: true,
      index: true,
    },
    lastInviteSentAt: { type: Date },
    passwordSetAt: { type: Date },
    passwordResetAt: { type: Date },
    lastLoginAt: { type: Date },
    // Bumped on password reset / sensitive PATCH to invalidate all prior JWTs
    tokenVersion: { type: Number, default: 0, required: true, min: 0 },

    createdBy: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

memberSchema.index({ employeeId: 1 }, { unique: true });
memberSchema.index({ personalEmail: 1 }, { unique: true, sparse: true });

const Member = mongoose.model('Member', memberSchema);

module.exports = Member;
