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

const memberCreateSchema = Joi.object({
  fullName: Joi.string().required().trim().messages({
    'string.empty': t.fullNameRequired,
  }),
  personalEmail: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.empty': t.personalEmailRequired,
      'string.email': t.personalEmailInvalid,
    }),
  phoneNumber: contactNumberSchema.required().messages({
    'object.base': t.phoneNumberRequired,
  }),
  homePhoneNumber: contactNumberSchema.required().messages({
    'object.base': t.homePhoneNumberRequired,
  }),
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
  addressLine1: Joi.string().required().trim().messages({
    'string.empty': t.addressLine1Required,
  }),
  addressLine2: Joi.string().trim().optional().allow('').empty(''),
  zipCode: Joi.string().required().trim().messages({
    'string.empty': t.zipCodeRequired,
  }),
  city: Joi.string().required().trim().messages({
    'string.empty': t.cityRequired,
  }),

  firstName: Joi.string().required().trim().messages({
    'string.empty': t.firstNameRequired,
  }),
  lastName: Joi.string().required().trim().messages({
    'string.empty': t.lastNameRequired,
  }),
  employeeId: Joi.string().required().trim().messages({
    'string.empty': t.employeeIdRequired,
  }),
  designation: Joi.string().required().trim().messages({
    'string.empty': t.designationRequired,
  }),
  employmentStatus: Joi.string()
    .valid(...MEMBER_EMPLOYMENT_STATUS_VALUES)
    .required()
    .messages({
      'any.required': t.employmentStatusRequired,
      'string.empty': t.employmentStatusRequired,
      'any.only': t.employmentStatusInvalid,
    }),
  dateOfJoining: Joi.date().required().messages({
    'any.required': t.dateOfJoiningRequired,
    'date.base': t.dateOfJoiningRequired,
  }),
  departmentRoles: Joi.array().items(departmentRoleItemSchema).min(1).required().messages({
    'array.min': t.departmentRolesMin,
    'any.required': t.departmentRolesRequired,
  }),
  officePhoneNumber: contactNumberSchema.required().messages({
    'object.base': t.officePhoneNumberRequired,
  }),

  aadharDocumentUrl: optionalMemberDocumentUrl,
  panDocumentUrl: optionalMemberDocumentUrl,
  cancelChequeDocumentUrl: optionalMemberDocumentUrl,

  // Invite controls — backend default sendInvite=true; inviteEmail overrides personalEmail
  sendInvite: Joi.boolean().default(true),
  inviteEmail: Joi.string()
    .email({ tlds: { allow: false } })
    .optional()
    .trim()
    .lowercase()
    .allow('')
    .empty('')
    .messages({
      'string.email': t.personalEmailInvalid,
    }),
});

/**
 * Validates member create request body. Returns 422 with formatted errors if invalid.
 * `createdBy` is not accepted from the client; it is set in the controller.
 */
const validateMember = (req, res, next) => {
  const { error, value } = memberCreateSchema.validate(req.body, {
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

module.exports = validateMember;
