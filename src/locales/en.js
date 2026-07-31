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
      airTicketRequired: 'airTicket is required when typeOfBooking is "Flight Booking"',
      airTicketForbidden: 'airTicket is not allowed when typeOfBooking is "Hotel Booking"',
      hotelBookingRequired: 'hotelBooking is required when typeOfBooking is "Hotel Booking"',
      hotelBookingForbidden: 'hotelBooking is not allowed when typeOfBooking is "Flight Booking"',
      departureEndBeforeStart: 'departureDateEnd must be on or after departureDate',
      checkOutBeforeCheckIn: 'checkOutDate must be on or after checkInDate',
      budgetDigitsOnly: 'Budget must contain digits only',
      budgetMaxLessThanMin: 'budgetMax must be greater than or equal to budgetMin',
      checklistPriorityRequired: 'Checklist priority is required',
      checklistPriorityInvalid: 'Checklist priority must be HIGH, MEDIUM, or LOW',
    },
    failed: 'Validation Failed',
    inquiryAssign: {
      userIdRequired: 'userId is required',
      userIdInvalid: 'userId must be a valid member id',
    },
    inquiryStatus: {
      statusRequired: 'status is required',
      statusInvalid: 'status must be PENDING, IN_PROGRESS, FOLLOWUP, COMPLETED, or CANCELLED',
    },
    qnaRead: {
      readAtInvalid: 'readAt must be a valid ISO 8601 date-time',
    },
    inquiryQuery: {
      invalidPageLimit: 'Page and limit must be at least 1',
      limitMax: 'Limit must not exceed 100',
    },
    inquiryPhoneQuery: {
      invalidPageLimit: 'Page and limit must be at least 1',
      limitMax: 'Limit must not exceed 100',
      numberRequired: 'Phone number is required',
      numberInvalid: 'Phone number must contain digits only (5–15 digits)',
    },
    amendmentSearchQuery: {
      invalidPageLimit: 'Page and limit must be at least 1',
      limitMax: 'Limit must not exceed 100',
      invalidDate: 'Date must be a valid ISO date',
      invalidDateRange: 'End date must be on or after the start date',
      invalidEnum: 'Invalid value for the selected filter',
    },
    unverifiedPaymentsQuery: {
      invalidPageLimit: 'Page and limit must be at least 1',
      limitMax: 'Limit must not exceed 100',
      invalidSort:
        'Sort must be one of: submittedAt, amount, createdAt (optionally prefixed with -)',
    },
    reminder: {
      remindAtRequired: 'Reminder date/time (remindAt) is required',
      remindAtInvalid: 'remindAt must be a valid ISO 8601 date-time with offset',
      recurrenceRuleInvalid: 'recurrenceRule must be a valid RFC 5545 RRULE string',
      agentRequired: 'Agent is required',
      agentInvalid: 'Agent must be a valid member id',
      inLoopUserInvalid: 'In-loop users must be valid member ids',
      priorityRequired: 'Priority is required',
      priorityInvalid: 'Priority must be HIGH, MEDIUM, or LOW',
      statusRequired: 'Status is required',
      statusInvalid: 'Status must be PENDING, IN_PROGRESS, FOLLOWUP, COMPLETED, or CANCELLED',
      memberNotFound: 'One or more referenced members do not exist',
      updateEmpty: 'Provide at least one field to update',
    },
    calendarQuery: {
      fromRequired: 'from date is required',
      toRequired: 'to date is required',
      dateInvalid: 'Dates must be valid ISO 8601 date-times',
      toBeforeFrom: 'to must be on or after from',
      rangeTooLarge: 'Date range must not exceed 92 days',
      agentInvalid: 'agent must be a valid member id',
      statusInvalid: 'Invalid status filter',
    },
    whatsapp: {
      toRequired: 'Recipient phone (to) is required',
      toInvalid: 'Recipient must be E.164 digits only, no + sign (10–15 digits)',
      textRequired: 'Message text is required',
      textTooLong: 'Message text must be at most 4096 characters',
      typeInvalid: 'Message type must be text, document, image, or template',
      templateRequired: 'template is required when type is template',
      templateNameRequired: 'template.name is required',
      templateNameInvalid: 'template.name must be lowercase letters, numbers, and underscores only',
      templateLanguageRequired: 'template.language is required (e.g. en, en_US)',
      inquiryIdInvalid: 'Inquiry ID must be a valid MongoDB ObjectId',
      sessionIdRequired: 'Session ID is required when sending in an amendment chat',
      textRequiredForType: 'Text or caption is required for this message type',
      peerPhoneInvalid: 'Peer phone must be E.164 digits only, no + sign (10–15 digits)',
    },
    whatsappQuery: {
      invalidPageLimit: 'Page and limit must be at least 1',
      limitMax: 'Limit must not exceed 100',
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
    memberDirectory: {
      departmentRequired: 'Department is required (e.g. Purchase)',
    },
    memberNameSearch: {
      searchRequired: 'Search term is required',
      limitMax: 'Limit must not exceed 25',
    },
    amendment: {
      actionRequired: 'Action is required',
      actionInvalid: 'Action must be put_follow_up, mark_pending, mark_loss, or mark_won',
      amendmentTypeRequired: 'Amendment type is required',
      amendmentTypeInvalid: 'Amendment type must be re_issue, cancelation, or booking',
      amountChargedRequired: 'Amount charged is required when marking as won',
      sessionIdInvalid: 'Session ID must be a valid UUID',
      noteTextRequired: 'Note text is required',
      invalidAction: 'Invalid amendment action',
      documentMimeInvalid: 'Only PDF, JPEG, JPG, or PNG files are allowed',
      documentTooLarge: 'File is too large (max 5MB)',
      inquiryIdRequired: 'Inquiry ID is required for amendment chat',
      sessionIdRequired: 'Session ID is required for amendment chat',
      mediaUrlRequired: 'mediaUrl is required for document or image messages',
    },
    amendmentQuery: {
      invalidPageLimit: 'Page and limit must be at least 1',
      limitMax: 'Limit must not exceed 100',
    },
    purchaseChat: {
      purchaseTeamMemberIdRequired: 'purchaseTeamMemberId is required',
      purchaseTeamMemberIdInvalid: 'purchaseTeamMemberId must be a valid MongoDB ObjectId',
      textRequired: 'Message text is required',
      mediaUrlRequired: 'mediaUrl is required for document or image messages',
      mediaUrlInvalid:
        'mediaUrl must be a path from POST .../purchase-chats/{purchaseTeamMemberId}/uploads',
    },
    payment: {
      totalAmountRequired: 'Total amount to be received is required',
      numberOfInstallmentsRequired: 'Number of installments must be at least 1',
      installmentsRequired: 'At least one installment is required',
      installmentsCountMismatch:
        'Number of installment rows must match the selected number of installments',
      installmentAmountRequired: 'Installment amount is required',
      paymentIdInvalid: 'paymentId (_id) must be a valid 24-character identifier',
      modeInvalid: 'Payment mode must be Cash, UPI, or Cheque',
      proofUrlInvalid: 'paymentProofUrl must be a path returned from POST .../payment-plan/uploads',
      proofFileRequired: 'No file uploaded. Use field name "file".',
      proofMimeInvalid: 'Only PDF, JPEG, JPG, or PNG files are allowed',
      proofTooLarge: 'File is too large (max 5MB)',
    },
    paymentVerification: {
      verifiedRequired: 'verified is required',
      verifiedInvalid: 'verified must be a boolean (true to verify, false to un-verify)',
    },
    password: {
      tokenRequired: 'Token is required',
      tokenInvalid: 'Token format is invalid',
      purposeRequired: 'Purpose is required',
      purposeInvalid: 'Purpose must be invite or reset',
      passwordRequired: 'Password is required',
      lengthInvalid: 'Password must be between 8 and 128 characters',
      strengthInvalid: 'Password must contain at least one letter and one digit',
      sameAsOld: 'New password must be different from the current password',
      emailRequired: 'Email is required',
      emailInvalid: 'Please provide a valid email',
      fieldForbidden: 'This field cannot be set via this endpoint',
    },
  },

  // ─── Auth messages ───────────────────────────────────────────────────────
  auth: {
    authenticationRequired: 'Authentication required',
    invalidOrExpiredToken: 'Invalid or expired token',
    sessionExpired: 'Your session has expired. Please log in again.',
    refreshTokenRequired: 'Refresh token is required',
    invalidRole: 'Role must be one of: admin, sales, purchase, account, user',
    invalidRefreshToken: 'Invalid refresh token',
    invalidOrExpiredRefreshToken: 'Invalid or expired refresh token',
    loginNotImplemented:
      'Login not implemented. Implement proper authentication before deploying to production.',
    insufficientRole: 'You do not have permission to perform this action',
    invalidCredentials: 'Invalid email or password',
    accountNotActive: 'Account is not active. Please complete the invite flow or contact admin.',
    passwordSet: 'Password set successfully',
    passwordReset: 'Password reset successfully',
    forgotPasswordAck: 'If an account with that email exists, a password reset link has been sent.',
    inviteSent: 'Invitation email sent',
    inviteResent: 'Invitation email re-sent',
    inviteAlreadyActive: 'Member account is already active; cannot resend invite',
    accountAlreadyActivePleaseLogin:
      'Your password is already set. Go to the login page and sign in with your email and password.',
    inviteLinkSuperseded:
      'This invite link is no longer valid (a newer invite was sent, or this link was already used). Ask your admin to resend the invite and open only the latest email.',
  },

  // ─── Error messages (global, service, model) ─────────────────────────────
  errors: {
    employeeIdExists: 'Employee ID already exists',
    personalEmailExists: 'Personal email is already in use',
    duplicateValue: 'A record with the same value already exists',
    memberNotFound: 'Member not found',
    purchaseTeamMemberNotFound: 'Purchase team member not found',
    purchaseChatThreadNotFound: 'Purchase team chat thread not found',
    inquiryNotFound: 'Inquiry not found',
    amendmentNotFound: 'Amendment not found',
    reminderNotFound: 'Reminder not found',
    amendmentSessionNotFound: 'Active amendment session not found or already finalized',
    amendmentSessionFinalized: 'This chat session is finalized; start a new session',
    paymentPlanNotFound: 'Payment plan not found for this inquiry',
    installmentNotFound: 'Installment not found for this payment plan',
    verifiedInstallmentLocked:
      'A verified installment cannot be edited or removed. Ask the account team to un-verify it first.',
    paymentNotVerified:
      'Payment must be verified by the account team before this amendment can be marked as won',
    somethingWentWrong: 'Something went wrong',
    invalidIdOrFormat: 'Invalid ID or data format',
    authTokenInvalid: 'Token is invalid',
    authTokenExpired: 'Token has expired. Please request a new link.',
    authTokenAlreadyUsed: 'This link has already been used. Please request a new one.',
    authTokenPurposeInvalid: 'Token purpose is invalid',
    authTokenUserIdRequired: 'userId is required to issue a token',
    emailRecipientRequired: 'Email recipient is required',
    emailLinkRequired: 'Email link is required',
    emailSendFailed: 'Failed to send email. Please try again later.',
    requestTimeout: 'Request timed out. Please try again.',
  },

  // ─── Rate limit messages ─────────────────────────────────────────────────
  rateLimit: {
    tooManyRequests: 'Too many requests, please try again later.',
    tooManyLoginAttempts: 'Too many login attempts, please try again later.',
    tooManyRefreshAttempts: 'Too many refresh attempts, please try again later.',
    tooManyForgotAttempts:
      'Too many password reset requests. Please wait a few minutes and try again.',
    tooManyResendInviteAttempts:
      'Too many invite resend attempts. Please wait a minute and try again.',
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
    resendApiKeyRequired: 'RESEND_API_KEY is required in production. Set it in your .env file.',
    appBaseUrlRequired:
      'APP_BASE_URL is required in production (or set PUBLIC_BASE_URL to the same https://kheruchiyagroup.com URL). Add it in your hosting environment variables and restart the server.',
  },

  // ─── Mongoose model validation ───────────────────────────────────────────
  model: {
    flightSegmentRequired: 'At least one flight segment is required',
    memberDepartmentRolesRequired: 'At least one department role is required',
  },
};
