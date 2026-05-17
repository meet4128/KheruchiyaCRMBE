const asyncHandler = require('../utils/asyncHandler');
const whatsappService = require('../services/whatsappService');

const sendText = asyncHandler(async (req, res) => {
  const { to, text } = req.body;
  const graphResponse = await whatsappService.sendTextMessage({ to, text });

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

module.exports = { sendText, getConversations, getMessages };
