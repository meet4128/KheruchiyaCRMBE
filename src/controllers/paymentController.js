const asyncHandler = require('../utils/asyncHandler');
const paymentService = require('../services/paymentService');
const { messages } = require('../locales');

const savePaymentPlan = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;
  const userId = req.user?.id;
  const paymentPlan = await paymentService.savePaymentPlan(inquiryId, req.body, userId);

  res.status(200).json({
    status: 'success',
    data: { paymentPlan },
  });
});

const getPaymentPlan = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;
  const paymentPlan = await paymentService.getPaymentPlan(inquiryId);

  res.status(200).json({
    status: 'success',
    data: { paymentPlan },
  });
});

const getUnverifiedPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.getUnverifiedPayments(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const uploadPaymentProof = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;
  if (!req.file) {
    return res.status(400).json({
      status: 'fail',
      data: { message: messages.validation.payment.proofFileRequired },
    });
  }

  // Ensure the inquiry exists before persisting an upload path against it.
  await paymentService.loadInquiry(inquiryId);

  const { publicMediaPath } = require('../middlewares/uploadPaymentProofFile');
  const paymentProofUrl = publicMediaPath(inquiryId, req.file.filename);

  res.status(201).json({
    status: 'success',
    data: {
      paymentProofUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
    },
  });
});

module.exports = {
  savePaymentPlan,
  getPaymentPlan,
  getUnverifiedPayments,
  uploadPaymentProof,
};
