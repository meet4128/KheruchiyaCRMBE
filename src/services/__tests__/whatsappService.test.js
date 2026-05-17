const { parseInboundMessages } = require('../whatsappService');

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
