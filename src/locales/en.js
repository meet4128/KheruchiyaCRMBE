/**
 * English localization - validation messages and static strings.
 * Add more locales (e.g. hi.js) for i18n support.
 */
module.exports = {
  // ─── Validation messages (Joi / inquiry) ─────────────────────────────────
  validation: {
    inquiry: {
      titleRequired: 'Title is required',
      phoneNumberRequired: 'Phone Number is required',
      fullNameRequired: 'Full Name is required',
      emailInvalid: 'Please provide a valid email',
      typeOfClientRequired: 'Type of Client is required',
      addressRequired: 'Address is required',
      referenceNumberRequired: 'Reference Number is required',
      referenceNameRequired: 'Reference Name is required',
      clientBehaviourRequired: 'Client Behaviour is required',
      typeOfBookingRequired: 'Type of Booking is required',
      phoneDigitsOnly: 'Phone/Reference number must contain digits only',
      flightSegmentsMin: 'ROUND_TRIP and MULTI_CITY require at least 2 flight segments',
    },
    failed: 'Validation Failed',
    inquiryQuery: {
      invalidPageLimit: 'Page and limit must be at least 1',
      limitMax: 'Limit must not exceed 100',
    },
    whatsapp: {
      toRequired: 'Recipient phone (to) is required',
      toInvalid: 'Recipient must be E.164 digits only, no + sign (10–15 digits)',
      textRequired: 'Message text is required',
      textTooLong: 'Message text must be at most 4096 characters',
    },
    member: {
      fullNameRequired: 'Full name is required',
      personalEmailRequired: 'Personal email is required',
      personalEmailInvalid: 'Please provide a valid personal email',
      phoneNumberRequired: 'Phone number is required',
      homePhoneNumberRequired: 'Home phone number is required',
      officePhoneNumberRequired: 'Office phone number is required',
      phoneDigitsOnly: 'Phone number must contain digits only',
      addressLine1Required: 'Address is required',
      zipCodeRequired: 'Zip code is required',
      cityRequired: 'City is required',
      firstNameRequired: 'First name is required',
      lastNameRequired: 'Last name is required',
      employeeIdRequired: 'Employee ID is required',
      designationRequired: 'Designation is required',
      employmentStatusRequired: 'Employment status is required',
      employmentStatusInvalid: 'Employment status is invalid',
      dateOfJoiningRequired: 'Date of joining is required',
      departmentRolesRequired: 'At least one department role is required',
      departmentRolesMin: 'At least one department role is required',
      departmentRoleDepartmentRequired: 'Department is required for each role row',
      departmentRoleRoleRequired: 'Role is required for each role row',
      genderInvalid: 'Gender is invalid',
      maritalStatusInvalid: 'Marital status is invalid',
      documentUrlInvalid:
        'Document must be a valid https URL or a path returned from POST /members/document-uploads (/uploads/members/...)',
      documentMimeInvalid: 'Only PDF or image files are allowed (PDF, JPEG, PNG, WebP, GIF)',
      documentTooLarge: 'Document file is too large',
      documentUploadFailed: 'Document upload failed',
      documentUploadAtLeastOne: 'Upload at least one file (aadharCard, panCard, or cancelCheque)',
      multipartJsonInvalid: 'Invalid JSON in multipart field',
      updateAtLeastOneField: 'At least one field is required to update a member',
    },
    memberQuery: {
      invalidPageLimit: 'Page and limit must be at least 1',
      limitMax: 'Limit must not exceed 100',
    },
  },

  // ─── Auth messages ───────────────────────────────────────────────────────
  auth: {
    authenticationRequired: 'Authentication required',
    invalidOrExpiredToken: 'Invalid or expired token',
    refreshTokenRequired: 'Refresh token is required',
    invalidRole: 'Role must be one of: admin, sales, purchase, user',
    invalidRefreshToken: 'Invalid refresh token',
    invalidOrExpiredRefreshToken: 'Invalid or expired refresh token',
    loginNotImplemented:
      'Login not implemented. Implement proper authentication before deploying to production.',
    insufficientRole: 'You do not have permission to perform this action',
  },

  // ─── Error messages (global, service, model) ─────────────────────────────
  errors: {
    referenceNumberExists: 'Reference number already exists',
    employeeIdExists: 'Employee ID already exists',
    personalEmailExists: 'Personal email is already in use',
    memberNotFound: 'Member not found',
    somethingWentWrong: 'Something went wrong',
    invalidIdOrFormat: 'Invalid ID or data format',
  },

  // ─── Rate limit messages ─────────────────────────────────────────────────
  rateLimit: {
    tooManyRequests: 'Too many requests, please try again later.',
    tooManyLoginAttempts: 'Too many login attempts, please try again later.',
    tooManyRefreshAttempts: 'Too many refresh attempts, please try again later.',
  },

  // ─── MongoDB / startup messages ───────────────────────────────────────────
  db: {
    fixNetworkAccess: 'Add your IP to MongoDB Atlas Network Access:',
    fixStep1: '1. Go to https://cloud.mongodb.com → your project',
    fixStep2: '2. Click "Network Access" (left sidebar)',
    fixStep3: '3. Click "Add IP Address" → "Add Current IP Address"',
    fixStep4: 'Or use 0.0.0.0/0 to allow all IPs (dev only)',
  },

  // ─── JWT / env validation (startup errors) ───────────────────────────────
  config: {
    jwtSecretRequired: 'JWT_SECRET is required in production. Set it in your .env file.',
    jwtRefreshSecretRequired:
      'JWT_REFRESH_SECRET is required in production. Set it in your .env file.',
  },

  // ─── Mongoose model validation ───────────────────────────────────────────
  model: {
    flightSegmentRequired: 'At least one flight segment is required',
    memberDepartmentRolesRequired: 'At least one department role is required',
  },
};
