const fs = require('fs');
const path = require('path');

jest.mock('../logger', () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { storeInboundMedia, extFromMime, safeBaseName } = require('../whatsappInboundMedia');

describe('whatsappInboundMedia', () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.WHATSAPP_ACCESS_TOKEN;

  beforeEach(() => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.WHATSAPP_ACCESS_TOKEN = originalToken;
    jest.restoreAllMocks();
  });

  it('maps mime types to extensions', () => {
    expect(extFromMime('application/pdf')).toBe('.pdf');
    expect(extFromMime('image/jpeg')).toBe('.jpg');
  });

  it('sanitizes file names', () => {
    expect(safeBaseName('aadhar.pdf', '.pdf')).toBe('aadhar.pdf');
    expect(safeBaseName('bad/name.pdf', '.pdf')).toBe('bad_name.pdf');
  });

  it('downloads media and writes file under uploads', async () => {
    const buffer = Buffer.from('%PDF-1.4');
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          url: 'https://lookaside.fbsbx.com/media/abc',
          mime_type: 'application/pdf',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => {
          const ab = new ArrayBuffer(buffer.length);
          new Uint8Array(ab).set(buffer);
          return ab;
        },
      });

    const result = await storeInboundMedia({
      mediaId: 'MEDIA123',
      mimeType: 'application/pdf',
      fileName: 'aadhar.pdf',
      peerPhone: '919811223344',
      inquiryId: '507f1f77bcf86cd799439011',
      sessionId: 'sess-uuid-1',
    });

    expect(result.mediaUrl).toMatch(
      /^\/uploads\/amendments\/inbound\/507f1f77bcf86cd799439011\/sess-uuid-1\/.+\.pdf$/
    );
    expect(result.fileName).toBe('aadhar.pdf');
    expect(result.mimeType).toBe('application/pdf');

    const absolutePath = path.join(process.cwd(), result.mediaUrl);
    expect(fs.existsSync(absolutePath)).toBe(true);
    fs.rmSync(path.join(process.cwd(), 'uploads', 'amendments', 'inbound'), {
      recursive: true,
      force: true,
    });
  });
});
