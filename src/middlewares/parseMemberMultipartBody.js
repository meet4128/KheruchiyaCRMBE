const AppError = require('../utils/AppError');
const { messages } = require('../locales');
const { parseMemberDocumentFiles } = require('./uploadMemberDocuments');

const JSON_PARSE_FIELDS = new Set([
  'phoneNumber',
  'homePhoneNumber',
  'officePhoneNumber',
  'departmentRoles',
]);

// Fields whose multipart string value should be coerced to a boolean before validation
// ("true"/"1" → true; "false"/"0"/"" → false).
const BOOLEAN_FIELDS = new Set(['sendInvite']);

function parseJsonField(raw, fieldName) {
  if (raw === undefined || raw === null || raw === '') return raw;
  if (typeof raw !== 'string') return raw;
  const t = raw.trim();
  if (!t.startsWith('{') && !t.startsWith('[')) return raw;
  try {
    return JSON.parse(t);
  } catch {
    throw new AppError(`${messages.validation.member.multipartJsonInvalid} (${fieldName})`, 422);
  }
}

function parseBooleanField(raw) {
  if (typeof raw === 'boolean') return raw;
  if (raw === undefined || raw === null) return raw;
  const v = String(raw).trim().toLowerCase();
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0' || v === '') return false;
  return raw; // let Joi flag anything else
}

function mapUploadedFilesToBody(req) {
  const files = req.files || {};
  const fieldToUrl = {
    aadharCard: 'aadharDocumentUrl',
    panCard: 'panDocumentUrl',
    cancelCheque: 'cancelChequeDocumentUrl',
  };
  for (const [field, urlKey] of Object.entries(fieldToUrl)) {
    const arr = files[field];
    const file = Array.isArray(arr) ? arr[0] : null;
    if (file?.filename) {
      req.body[urlKey] = `/uploads/members/${file.filename}`;
    }
  }
}

/**
 * When `Content-Type` is `multipart/form-data`, parses text fields into `req.body`,
 * JSON-string fields (`phoneNumber`, `homePhoneNumber`, `officePhoneNumber`, `departmentRoles`),
 * and optional file fields `aadharCard`, `panCard`, `cancelCheque` (PDF/images) into `*DocumentUrl`.
 * JSON requests skip this middleware unchanged.
 */
const parseMemberMultipartBody = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    return next();
  }

  parseMemberDocumentFiles(req, res, (err) => {
    if (err) return next(err);
    try {
      const b = req.body;
      for (const key of JSON_PARSE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(b, key)) {
          b[key] = parseJsonField(b[key], key);
        }
      }
      for (const key of BOOLEAN_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(b, key)) {
          b[key] = parseBooleanField(b[key]);
        }
      }
      mapUploadedFilesToBody(req);
    } catch (e) {
      return next(e);
    }
    next();
  });
};

module.exports = parseMemberMultipartBody;
