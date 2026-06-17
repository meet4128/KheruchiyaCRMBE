/** Outbound WhatsApp send types — includes template for business-initiated messages */
const WHATSAPP_SEND_TYPE = Object.freeze({
  TEXT: 'text',
  DOCUMENT: 'document',
  IMAGE: 'image',
  TEMPLATE: 'template',
});

const WHATSAPP_SEND_TYPE_VALUES = Object.values(WHATSAPP_SEND_TYPE);

/** Stored on WhatsappMessage records (amendment chat types + template) */
const WHATSAPP_MESSAGE_TYPE_VALUES = [...WHATSAPP_SEND_TYPE_VALUES];

module.exports = {
  WHATSAPP_SEND_TYPE,
  WHATSAPP_SEND_TYPE_VALUES,
  WHATSAPP_MESSAGE_TYPE_VALUES,
};
