const asyncHandler = require('../utils/asyncHandler');
const whatsappService = require('../services/whatsappService');

const sendMessage = asyncHandler(async (req, res) => {
  const { to, type, text, sessionId, inquiryId, mediaUrl, fileName } = req.body;
  const graphResponse = await whatsappService.sendMessage({
    to,
    type,
    text,
    sessionId,
    inquiryId,
    mediaUrl,
    fileName,
    userId: req.user?.id,
  });

  res.status(200).json({
    status: 'success',
    data: {
      graph: graphResponse,
    },
  });
});

const getConversations = asyncHandler(async (req, res) => {
  const result = await whatsappService.getConversations(req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

const getMessages = asyncHandler(async (req, res) => {
  const { peerPhone } = req.params;
  const result = await whatsappService.getMessagesByPeer(peerPhone, req.query);

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

module.exports = { sendMessage, getConversations, getMessages };
