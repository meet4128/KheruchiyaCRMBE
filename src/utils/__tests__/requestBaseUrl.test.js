const { resolveAppBaseUrlFromRequest } = require('../requestBaseUrl');

describe('resolveAppBaseUrlFromRequest', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('prefers APP_BASE_URL from env', () => {
    process.env.APP_BASE_URL = 'https://from-env.example';
    const req = { get: () => undefined, secure: true, protocol: 'https' };
    expect(resolveAppBaseUrlFromRequest(req)).toBe('https://from-env.example');
  });

  it('derives base URL from Host when env unset', () => {
    delete process.env.APP_BASE_URL;
    delete process.env.PUBLIC_BASE_URL;
    process.env.NODE_ENV = 'production';

    const headers = {
      host: 'kheruchiyagroup.com',
      'x-forwarded-proto': 'https',
    };
    const req = {
      get: (name) => headers[name.toLowerCase()],
      secure: true,
      protocol: 'http',
    };

    expect(resolveAppBaseUrlFromRequest(req)).toBe('https://kheruchiyagroup.com');
  });

  it('forces https in production when proxy reports http', () => {
    delete process.env.APP_BASE_URL;
    delete process.env.PUBLIC_BASE_URL;
    process.env.NODE_ENV = 'production';

    const req = {
      get: (name) => (name === 'host' ? 'kheruchiyagroup.com' : undefined),
      secure: false,
      protocol: 'http',
    };

    expect(resolveAppBaseUrlFromRequest(req)).toBe('https://kheruchiyagroup.com');
  });
});
