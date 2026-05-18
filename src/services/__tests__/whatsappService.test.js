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
        type: 'text',
        text: 'Hello in Hindi',
        timestamp: '1710000000',
      },
    ]);
  });

  it('extracts document messages from webhook shape', () => {
    const body = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messages: [
                  {
                    from: '919811223344',
                    id: 'wamid.doc',
                    timestamp: '1710000001',
                    type: 'document',
                    document: {
                      id: 'META_MEDIA_ID',
                      caption: 'My Aadhar',
                      filename: 'aadhar.pdf',
                      mime_type: 'application/pdf',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const out = parseInboundMessages(body);
    expect(out[0].type).toBe('document');
    expect(out[0].mediaId).toBe('META_MEDIA_ID');
    expect(out[0].fileName).toBe('aadhar.pdf');
    expect(out[0].text).toBe('My Aadhar');
  });

  it('extracts image messages with media id', () => {
    const body = {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                messages: [
                  {
                    from: '919811223344',
                    id: 'wamid.img',
                    timestamp: '1710000002',
                    type: 'image',
                    image: {
                      id: 'IMG_MEDIA_ID',
                      mime_type: 'image/jpeg',
                      caption: 'Ticket',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const out = parseInboundMessages(body);
    expect(out[0].type).toBe('image');
    expect(out[0].mediaId).toBe('IMG_MEDIA_ID');
    expect(out[0].text).toBe('Ticket');
  });
});
