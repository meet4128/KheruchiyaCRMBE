/** Meta webhook delivery status values for outbound messages */
const WHATSAPP_DELIVERY_STATUS = Object.freeze({
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
});

const WHATSAPP_DELIVERY_STATUS_VALUES = Object.values(WHATSAPP_DELIVERY_STATUS);

module.exports = { WHATSAPP_DELIVERY_STATUS, WHATSAPP_DELIVERY_STATUS_VALUES };
