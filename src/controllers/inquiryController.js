const inquiryService = require('../services/inquiryService');
const asyncHandler = require('../utils/asyncHandler');

const createInquiry = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const payload = {
    ...req.body,
    createdBy: userId,
  };

  const inquiry = await inquiryService.createInquiry(payload);

  res.status(201).json({
    status: 'success',
    data: {
      inquiry,
    },
  });
});

const getInquiries = asyncHandler(async (req, res) => {
  const result = await inquiryService.getAllInquiries(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getInquiriesByPhone = asyncHandler(async (req, res) => {
  const result = await inquiryService.getInquiriesByPhone(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getInquiryById = asyncHandler(async (req, res) => {
  const inquiry = await inquiryService.getInquiryById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { inquiry },
  });
});

const getChecklistPriorityDefaults = asyncHandler(async (req, res) => {
  const priorities = inquiryService.getChecklistPriorityDefaults();

  res.status(200).json({
    status: 'success',
    data: { priorities },
  });
});

module.exports = {
  createInquiry,
  getInquiries,
  getInquiriesByPhone,
  getInquiryById,
  getChecklistPriorityDefaults,
};
