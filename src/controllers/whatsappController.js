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

module.exports = { sendText };
