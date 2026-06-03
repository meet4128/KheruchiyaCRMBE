const {
  getRequestTimeoutMs,
  getWebhookRequestTimeoutMs,
  getTrustProxySetting,
} = require('../httpTimeouts');

describe('httpTimeouts config', () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
  });

  it('parses HTTP_REQUEST_TIMEOUT_MS', () => {
    process.env.HTTP_REQUEST_TIMEOUT_MS = '90000';
    expect(getRequestTimeoutMs()).toBe(90000);
  });

  it('defaults webhook timeout higher than API', () => {
    delete process.env.HTTP_WEBHOOK_REQUEST_TIMEOUT_MS;
    expect(getWebhookRequestTimeoutMs()).toBeGreaterThanOrEqual(180000);
  });

  it('uses TRUST_PROXY_HOPS in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.TRUST_PROXY_HOPS = '2';
    expect(getTrustProxySetting()).toBe(2);
  });
});
