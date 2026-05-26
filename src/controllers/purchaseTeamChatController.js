const asyncHandler = require('../utils/asyncHandler');
const purchaseTeamChatService = require('../services/purchaseTeamChatService');

const listThreads = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;
  const result = await purchaseTeamChatService.listThreadsByInquiry(inquiryId, req.user, req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const openThread = asyncHandler(async (req, res) => {
  const { inquiryId } = req.params;
  const { purchaseTeamMemberId } = req.body;
  const userId = req.user?.id;

  const thread = await purchaseTeamChatService.getOrCreateThread(
    inquiryId,
    purchaseTeamMemberId,
    userId
  );

  res.status(201).json({
    status: 'success',
    data: { thread },
  });
});

const getMessages = asyncHandler(async (req, res) => {
  const { inquiryId, purchaseTeamMemberId } = req.params;
  const result = await purchaseTeamChatService.getMessages(
    inquiryId,
    purchaseTeamMemberId,
    req.user,
    req.query
  );

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const { inquiryId, purchaseTeamMemberId } = req.params;

  const message = await purchaseTeamChatService.sendMessage(
    inquiryId,
    purchaseTeamMemberId,
    req.body,
    req.user
  );

  res.status(201).json({
    status: 'success',
    data: { message },
  });
});

const uploadFile = asyncHandler(async (req, res) => {
  const { inquiryId, purchaseTeamMemberId } = req.params;
  if (!req.file) {
    return res.status(400).json({
      status: 'fail',
      data: { message: 'No file uploaded. Use field name "file".' },
    });
  }

  await purchaseTeamChatService.loadInquiry(inquiryId);
  await purchaseTeamChatService.loadPurchaseTeamMember(purchaseTeamMemberId);
  await purchaseTeamChatService.assertCanAccessThread(req.user, purchaseTeamMemberId);
  await purchaseTeamChatService.getOrCreateThread(inquiryId, purchaseTeamMemberId, req.user?.id);

  const { publicMediaPath } = require('../middlewares/uploadPurchaseChatFile');
  const mediaUrl = publicMediaPath(inquiryId, purchaseTeamMemberId, req.file.filename);

  res.status(201).json({
    status: 'success',
    data: {
      mediaUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
    },
  });
});

module.exports = {
  listThreads,
  openThread,
  getMessages,
  sendMessage,
  uploadFile,
};
