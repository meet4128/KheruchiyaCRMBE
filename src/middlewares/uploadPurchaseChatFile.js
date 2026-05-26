const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');
const { messages } = require('../locales');

const allowedMime = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']);

const allowedExt = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

const chatUploadRoot = (inquiryId, purchaseTeamMemberId) =>
  path.join(
    process.cwd(),
    'uploads',
    'purchase-chats',
    String(inquiryId),
    String(purchaseTeamMemberId)
  );

const maxBytes = () =>
  Math.min(
    Math.max(
      parseInt(
        process.env.AMENDMENT_DOC_MAX_BYTES ||
          process.env.MEMBER_DOC_MAX_BYTES ||
          `${5 * 1024 * 1024}`,
        10
      ),
      1024
    ),
    20 * 1024 * 1024
  );

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = chatUploadRoot(req.params.inquiryId, req.params.purchaseTeamMemberId);
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
    cb(new AppError(messages.validation.amendment.documentMimeInvalid, 400));
  }
};

const uploadSingle = multer({
  storage,
  limits: { fileSize: maxBytes() },
  fileFilter,
}).single('file');

const uploadPurchaseChatFile = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(messages.validation.amendment.documentTooLarge, 400));
    }
    return next(err);
  });
};

const publicMediaPath = (inquiryId, purchaseTeamMemberId, filename) =>
  `/uploads/purchase-chats/${inquiryId}/${purchaseTeamMemberId}/${filename}`;

const purchaseChatUploadPattern =
  /^\/uploads\/purchase-chats\/[a-fA-F0-9]{24}\/[a-fA-F0-9]{24}\/[a-zA-Z0-9._-]+\.(pdf|jpe?g|png)$/i;

module.exports = {
  uploadPurchaseChatFile,
  publicMediaPath,
  chatUploadRoot,
  purchaseChatUploadPattern,
};
