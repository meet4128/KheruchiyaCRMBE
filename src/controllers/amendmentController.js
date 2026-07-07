const asyncHandler = require('../utils/asyncHandler');
const amendmentService = require('../services/amendmentService');

const finalizeAmendment = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;
  const userId = req.user?.id;
  const amendment = await amendmentService.finalizeAmendment(inquiryId, req.body, userId);

  res.status(201).json({
    status: 'success',
    data: { amendment },
  });
});

const searchAmendments = asyncHandler(async (req, res) => {
  const result = await amendmentService.searchAmendments(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const listAmendments = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;
  const amendments = await amendmentService.listAmendmentsByInquiry(inquiryId);

  res.status(200).json({
    status: 'success',
    data: { amendments },
  });
});

const getAmendment = asyncHandler(async (req, res) => {
  const { inquiryId, amendmentId } = req.params;
  const amendment = await amendmentService.getAmendment(inquiryId, amendmentId);

  res.status(200).json({
    status: 'success',
    data: { amendment },
  });
});

const getAmendmentMessages = asyncHandler(async (req, res) => {
  const { inquiryId, amendmentId } = req.params;
  const result = await amendmentService.getAmendmentMessages(inquiryId, amendmentId, req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getSessionMessages = asyncHandler(async (req, res) => {
  const { inquiryId, sessionId } = req.params;
  const result = await amendmentService.getSessionMessages(inquiryId, sessionId, req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getAmendmentNotes = asyncHandler(async (req, res) => {
  const { inquiryId, amendmentId } = req.params;
  const notes = await amendmentService.getAmendmentNotes(inquiryId, amendmentId);

  res.status(200).json({
    status: 'success',
    data: { notes },
  });
});

const uploadSessionFile = asyncHandler(async (req, res) => {
  const { inquiryId, sessionId } = req.params;
  if (!req.file) {
    return res.status(400).json({
      status: 'fail',
      data: { message: 'No file uploaded. Use field name "file".' },
    });
  }

  const userId = req.user?.id;
  const inquiry = await amendmentService.loadInquiry(inquiryId);
  const peerPhone = amendmentService.phoneToPeer(inquiry.phoneNumber);
  if (peerPhone) {
    await amendmentService.registerActiveSession(inquiryId, sessionId, peerPhone, userId);
  }

  const { publicMediaPath } = require('../middlewares/uploadAmendmentSessionFile');
  const mediaUrl = publicMediaPath(sessionId, req.file.filename);

  res.status(201).json({
    status: 'success',
    data: {
      mediaUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
    },
  });
});

const addSessionNote = asyncHandler(async (req, res) => {
  const { inquiryId, sessionId } = req.params;
  const userId = req.user?.id;
  const note = await amendmentService.addSessionNote(inquiryId, sessionId, req.body.text, userId);

  res.status(201).json({
    status: 'success',
    data: { note },
  });
});

module.exports = {
  finalizeAmendment,
  searchAmendments,
  listAmendments,
  getAmendment,
  getAmendmentMessages,
  getSessionMessages,
  getAmendmentNotes,
  addSessionNote,
  uploadSessionFile,
};
