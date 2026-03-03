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
  },

  // ─── Auth messages ───────────────────────────────────────────────────────
  auth: {
    authenticationRequired: 'Authentication required',
    invalidOrExpiredToken: 'Invalid or expired token',
    refreshTokenRequired: 'Refresh token is required',
    invalidRefreshToken: 'Invalid refresh token',
    invalidOrExpiredRefreshToken: 'Invalid or expired refresh token',
    loginNotImplemented:
      'Login not implemented. Implement proper authentication before deploying to production.',
  },

  // ─── Error messages (global, service, model) ─────────────────────────────
  errors: {
    referenceNumberExists: 'Reference number already exists',
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
  },
};
