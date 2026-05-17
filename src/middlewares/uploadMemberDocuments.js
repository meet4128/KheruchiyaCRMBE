const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');
const { messages } = require('../locales');

const UPLOAD_SUBDIR = 'members';

const allowedMime = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const allowedExt = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif']);

const uploadRoot = () => path.join(process.cwd(), 'uploads', UPLOAD_SUBDIR);

const maxBytes = () =>
  Math.min(
    Math.max(parseInt(process.env.MEMBER_DOC_MAX_BYTES || `${5 * 1024 * 1024}`, 10), 1024),
    20 * 1024 * 1024
  );

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = uploadRoot();
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = allowedExt.has(ext) ? ext : '';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt || '.bin'}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (allowedMime.has(file.mimetype) || allowedExt.has(ext)) {
    cb(null, true);
  } else {
    cb(new AppError(messages.validation.member.documentMimeInvalid, 400));
  }
};

const multerInstance = multer({
  storage,
  limits: { fileSize: maxBytes() },
  fileFilter,
});

const uploadFields = multerInstance.fields([
  { name: 'aadharCard', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'cancelCheque', maxCount: 1 },
]);

/**
 * Parses multipart file fields for member documents (Aadhar, PAN, cancel cheque).
 * PDF and common image types only. Populates `req.files` and text fields in `req.body`.
 */
const parseMemberDocumentFiles = (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (!err) {
      return next();
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(messages.validation.member.documentTooLarge, 400));
      }
      return next(new AppError(messages.validation.member.documentUploadFailed, 400));
    }
    return next(err);
  });
};

/** Alias for `POST /document-uploads` route (same multer parser). */
const uploadMemberDocuments = parseMemberDocumentFiles;

module.exports = { parseMemberDocumentFiles, uploadMemberDocuments, uploadRoot };
