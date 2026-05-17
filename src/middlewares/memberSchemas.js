const Joi = require('joi');
const { MEMBER_GENDER_VALUES } = require('../constants/memberGender');
const { MEMBER_MARITAL_STATUS_VALUES } = require('../constants/memberMaritalStatus');
const { MEMBER_EMPLOYMENT_STATUS_VALUES } = require('../constants/memberEmploymentStatus');
const { messages } = require('../locales');

const t = messages.validation.member;

const contactNumberSchema = Joi.object({
  countryCode: Joi.string().required().trim(),
  number: Joi.string().pattern(/^\d+$/).min(6).required().messages({
    'string.pattern.base': t.phoneDigitsOnly,
  }),
});

const departmentRoleItemSchema = Joi.object({
  department: Joi.string().required().trim().messages({
    'string.empty': t.departmentRoleDepartmentRequired,
  }),
  role: Joi.string().required().trim().messages({
    'string.empty': t.departmentRoleRoleRequired,
  }),
});

/** Public URLs from this server after POST /members/document-uploads */
const uploadedMemberDocPattern = /^\/uploads\/members\/[a-zA-Z0-9._-]+\.(pdf|jpe?g|png|gif|webp)$/i;

const isValidMemberDocumentRef = (value) => {
  if (!value || typeof value !== 'string') return false;
  const v = value.trim();
  if (uploadedMemberDocPattern.test(v)) return true;
  const { error } = Joi.string()
    .uri({ scheme: ['http', 'https'], allowRelative: false })
    .validate(v);
  return !error;
};

const optionalMemberDocumentUrl = Joi.string()
  .trim()
  .optional()
  .allow('')
  .empty('')
  .custom((value, helpers) => {
    if (!value) return value;
    if (isValidMemberDocumentRef(value)) return value;
    return helpers.error('any.invalid');
  })
  .messages({
    'any.invalid': t.documentUrlInvalid,
  });

module.exports = {
  t,
  messages,
  MEMBER_GENDER_VALUES,
  MEMBER_MARITAL_STATUS_VALUES,
  MEMBER_EMPLOYMENT_STATUS_VALUES,
  contactNumberSchema,
  departmentRoleItemSchema,
  optionalMemberDocumentUrl,
};
