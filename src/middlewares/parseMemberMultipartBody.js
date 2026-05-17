const AppError = require('../utils/AppError');
const { messages } = require('../locales');
const { parseMemberDocumentFiles } = require('./uploadMemberDocuments');

const JSON_PARSE_FIELDS = new Set([
  'phoneNumber',
  'homePhoneNumber',
  'officePhoneNumber',
  'departmentRoles',
]);

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
      mapUploadedFilesToBody(req);
    } catch (e) {
      return next(e);
    }
    next();
  });
};

module.exports = parseMemberMultipartBody;
