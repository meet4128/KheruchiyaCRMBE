const Joi = require('joi');
const {
  messages,
  MEMBER_GENDER_VALUES,
  MEMBER_MARITAL_STATUS_VALUES,
  MEMBER_EMPLOYMENT_STATUS_VALUES,
  contactNumberSchema,
  departmentRoleItemSchema,
  optionalMemberDocumentUrl,
  t,
} = require('./memberSchemas');

const memberUpdateSchema = Joi.object({
  fullName: Joi.string().trim().optional().min(1).messages({
    'string.empty': t.fullNameRequired,
  }),
  personalEmail: Joi.string()
    .email({ tlds: { allow: false } })
    .optional()
    .trim()
    .lowercase()
    .messages({
      'string.email': t.personalEmailInvalid,
    }),
  phoneNumber: contactNumberSchema.optional(),
  homePhoneNumber: contactNumberSchema.optional(),
  dateOfBirth: Joi.date().optional().allow('').empty(''),
  gender: Joi.string()
    .valid(...MEMBER_GENDER_VALUES)
    .optional()
    .allow('')
    .empty('')
    .messages({
      'any.only': t.genderInvalid,
    }),
  maritalStatus: Joi.string()
    .valid(...MEMBER_MARITAL_STATUS_VALUES)
    .optional()
    .allow('')
    .empty('')
    .messages({
      'any.only': t.maritalStatusInvalid,
    }),
  dateOfAnniversary: Joi.date().optional().allow('').empty(''),
  addressLine1: Joi.string().trim().optional().min(1).messages({
    'string.empty': t.addressLine1Required,
  }),
  addressLine2: Joi.string().trim().optional().allow('').empty(''),
  zipCode: Joi.string().trim().optional().min(1).messages({
    'string.empty': t.zipCodeRequired,
  }),
  city: Joi.string().trim().optional().min(1).messages({
    'string.empty': t.cityRequired,
  }),
  firstName: Joi.string().trim().optional().min(1).messages({
    'string.empty': t.firstNameRequired,
  }),
  lastName: Joi.string().trim().optional().min(1).messages({
    'string.empty': t.lastNameRequired,
  }),
  employeeId: Joi.string().trim().optional().min(1).messages({
    'string.empty': t.employeeIdRequired,
  }),
  designation: Joi.string().trim().optional().min(1).messages({
    'string.empty': t.designationRequired,
  }),
  employmentStatus: Joi.string()
    .valid(...MEMBER_EMPLOYMENT_STATUS_VALUES)
    .optional()
    .messages({
      'any.only': t.employmentStatusInvalid,
    }),
  dateOfJoining: Joi.date().optional().allow('').empty(''),
  departmentRoles: Joi.array().items(departmentRoleItemSchema).min(1).optional().messages({
    'array.min': t.departmentRolesMin,
  }),
  officePhoneNumber: contactNumberSchema.optional(),

  aadharDocumentUrl: optionalMemberDocumentUrl,
  panDocumentUrl: optionalMemberDocumentUrl,
  cancelChequeDocumentUrl: optionalMemberDocumentUrl,

  // Deny-list: protected auth/invitation fields are NEVER accepted via PATCH.
  // Joi returns 422 (loud) instead of silently stripping — see passwordflow.md §7 Phase 0.
  passwordHash: Joi.any().forbidden().messages({
    'any.unknown': messages.validation.password.fieldForbidden,
  }),
  invitationStatus: Joi.any().forbidden().messages({
    'any.unknown': messages.validation.password.fieldForbidden,
  }),
  lastInviteSentAt: Joi.any().forbidden().messages({
    'any.unknown': messages.validation.password.fieldForbidden,
  }),
  passwordSetAt: Joi.any().forbidden().messages({
    'any.unknown': messages.validation.password.fieldForbidden,
  }),
  passwordResetAt: Joi.any().forbidden().messages({
    'any.unknown': messages.validation.password.fieldForbidden,
  }),
  lastLoginAt: Joi.any().forbidden().messages({
    'any.unknown': messages.validation.password.fieldForbidden,
  }),
  tokenVersion: Joi.any().forbidden().messages({
    'any.unknown': messages.validation.password.fieldForbidden,
  }),
  loginRole: Joi.any().forbidden().messages({
    'any.unknown': messages.validation.password.fieldForbidden,
  }),
})
  .min(1)
  .messages({
    'object.min': t.updateAtLeastOneField,
  });

const validateMemberUpdate = (req, res, next) => {
  const { error, value } = memberUpdateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return res.status(422).json({
      status: 'fail',
      data: { message: messages.validation.failed, errors },
    });
  }

  req.body = value;
  next();
};

module.exports = validateMemberUpdate;
