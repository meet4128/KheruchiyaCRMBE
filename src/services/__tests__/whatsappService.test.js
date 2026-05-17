const {
  parseInboundMessages,
  persistInboundMessages,
  persistOutboundMessage,
  getConversations,
  getMessagesByPeer,
} = require('../whatsappService');
const { WHATSAPP_MESSAGE_DIRECTION } = require('../../constants/whatsappMessageDirection');

jest.mock('../../models/WhatsappMessage', () => ({
  findOneAndUpdate: jest.fn(),
  aggregate: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

const WhatsappMessage = require('../../models/WhatsappMessage');

describe('whatsappService.parseInboundMessages', () => {
  it('returns empty array for invalid body', () => {
    expect(parseInboundMessages(null)).toEqual([]);
    expect(parseInboundMessages({})).toEqual([]);
    expect(parseInboundMessages({ object: 'other' })).toEqual([]);
  });

  it('extracts text messages from Cloud API webhook shape', () => {
    const body = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA_ID',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                messages: [
                  {
                    from: '919811223344',
                    id: 'wamid.HBgM',
                    timestamp: '1710000000',
                    type: 'text',
                    text: { body: 'Hello in Hindi' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const out = parseInboundMessages(body);
    expect(out).toEqual([
      {
        id: 'wamid.HBgM',
        from: '919811223344',
        text: 'Hello in Hindi',
        timestamp: '1710000000',
      },
    ]);
  });
});

describe('whatsappService persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    WhatsappMessage.findOneAndUpdate.mockResolvedValue({});
  });

  it('persists inbound messages with idempotent upsert on wamid', async () => {
    const messages = [
      {
        id: 'wamid.in.1',
        from: '919811223344',
        text: 'Hi',
        timestamp: '1710000000',
      },
    ];

    await persistInboundMessages(messages);

    expect(WhatsappMessage.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(WhatsappMessage.findOneAndUpdate).toHaveBeenCalledWith(
      { wamid: 'wamid.in.1' },
      {
        $setOnInsert: expect.objectContaining({
          wamid: 'wamid.in.1',
          direction: WHATSAPP_MESSAGE_DIRECTION.INBOUND,
          peerPhone: '919811223344',
          text: 'Hi',
        }),
      },
      { upsert: true }
    );
  });

  it('persists outbound messages with idempotent upsert on wamid', async () => {
    await persistOutboundMessage({
      wamid: 'wamid.out.1',
      to: '919876543210',
      text: 'Reply',
    });

    expect(WhatsappMessage.findOneAndUpdate).toHaveBeenCalledWith(
      { wamid: 'wamid.out.1' },
      {
        $setOnInsert: expect.objectContaining({
          direction: WHATSAPP_MESSAGE_DIRECTION.OUTBOUND,
          peerPhone: '919876543210',
          text: 'Reply',
        }),
      },
      { upsert: true }
    );
  });

  it('getConversations runs aggregation with pagination facet', async () => {
    WhatsappMessage.aggregate.mockResolvedValue([
      {
        metadata: [{ totalItems: 1 }],
        items: [
          {
            peerPhone: '919876543210',
            messageCount: 2,
            lastMessage: { text: 'Hi' },
          },
        ],
      },
    ]);

    const result = await getConversations({ page: 1, limit: 10, search: '987' });

    expect(WhatsappMessage.aggregate).toHaveBeenCalled();
    expect(result.totalItems).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  it('getMessagesByPeer queries by peerPhone with pagination', async () => {
    const sortMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockReturnThis();
    const skipMock = jest.fn().mockReturnThis();
    const leanMock = jest.fn().mockResolvedValue([{ wamid: 'wamid.1', text: 'Hi' }]);

    WhatsappMessage.find.mockReturnValue({
      skip: skipMock,
      limit: limitMock,
      sort: sortMock,
      lean: leanMock,
    });
    skipMock.mockReturnValue({ limit: limitMock });
    limitMock.mockReturnValue({ sort: sortMock });
    sortMock.mockReturnValue({ lean: leanMock });
    WhatsappMessage.countDocuments.mockResolvedValue(1);

    const result = await getMessagesByPeer('919876543210', { page: 1, limit: 50 });

    expect(WhatsappMessage.find).toHaveBeenCalledWith({ peerPhone: '919876543210' });
    expect(result.peerPhone).toBe('919876543210');
    expect(result.totalItems).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});
