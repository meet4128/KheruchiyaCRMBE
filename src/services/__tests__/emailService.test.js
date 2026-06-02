const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

const emailService = require('../emailService');

describe('emailService', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    mockSend.mockReset();
    emailService.resetClientForTests();
    process.env.APP_BASE_URL = 'http://localhost:3000';
    process.env.EMAIL_FROM = 'Test CRM <no-reply@test.example>';
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('link builders', () => {
    it('builds invite/reset links from APP_BASE_URL and url-encodes token', () => {
      const inviteLink = emailService.buildInviteLink('abc/123');
      const resetLink = emailService.buildResetLink('abc 123');
      expect(inviteLink).toBe('http://localhost:3000/set-password?token=abc%2F123');
      expect(resetLink).toBe('http://localhost:3000/reset-password?token=abc%20123');
    });

    it('falls back to localhost:PORT when APP_BASE_URL unset in dev', () => {
      delete process.env.APP_BASE_URL;
      process.env.PORT = '5001';
      expect(emailService.buildInviteLink('t')).toMatch(/^http:\/\/localhost:5001\/set-password/);
    });

    it('throws in production when APP_BASE_URL and PUBLIC_BASE_URL missing', () => {
      delete process.env.APP_BASE_URL;
      delete process.env.PUBLIC_BASE_URL;
      process.env.NODE_ENV = 'production';
      expect(() => emailService.buildInviteLink('t')).toThrow();
      process.env.NODE_ENV = 'test';
    });

    it('uses PUBLIC_BASE_URL when APP_BASE_URL unset', () => {
      delete process.env.APP_BASE_URL;
      process.env.PUBLIC_BASE_URL = 'https://kheruchiyagroup.com/';
      expect(emailService.buildInviteLink('t')).toBe(
        'https://kheruchiyagroup.com/set-password?token=t'
      );
    });
  });

  describe('sendInviteEmail', () => {
    it('falls back to console when RESEND_API_KEY missing (dev)', async () => {
      const result = await emailService.sendInviteEmail({
        to: 'a@b.com',
        fullName: 'Aisha',
        link: 'http://localhost:3000/set-password?token=t',
        expiresAt: new Date('2026-06-01T00:00:00Z'),
      });
      expect(result.devFallback).toBe(true);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('calls Resend when RESEND_API_KEY is set', async () => {
      process.env.RESEND_API_KEY = 'rs_test';
      mockSend.mockResolvedValue({ data: { id: 'em_1' } });
      const result = await emailService.sendInviteEmail({
        to: 'a@b.com',
        fullName: 'Aisha',
        link: 'http://localhost:3000/set-password?token=t',
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      const payload = mockSend.mock.calls[0][0];
      expect(payload.to).toBe('a@b.com');
      expect(payload.from).toBe('Test CRM <no-reply@test.example>');
      expect(payload.subject).toMatch(/set your password/i);
      expect(payload.html).toContain('Set your password');
      expect(payload.html).toContain('http://localhost:3000/set-password?token=t');
      expect(result.id).toBe('em_1');
      expect(result.devFallback).toBe(false);
    });

    it('throws 502 when Resend returns error without throwing', async () => {
      process.env.RESEND_API_KEY = 'rs_test';
      mockSend.mockResolvedValue({
        data: null,
        error: { statusCode: 403, message: 'domain is not verified' },
      });
      await expect(
        emailService.sendInviteEmail({
          to: 'a@b.com',
          fullName: 'Aisha',
          link: 'http://localhost:3000/set-password?token=t',
        })
      ).rejects.toMatchObject({ statusCode: 502 });
    });

    it('requires a recipient and link', async () => {
      await expect(emailService.sendInviteEmail({ link: 'x' })).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(emailService.sendInviteEmail({ to: 'a@b.com' })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('escapes user-supplied fullName to prevent HTML injection', async () => {
      process.env.RESEND_API_KEY = 'rs_test';
      mockSend.mockResolvedValue({ data: { id: 'em_2' } });
      await emailService.sendInviteEmail({
        to: 'a@b.com',
        fullName: '<script>alert(1)</script>',
        link: 'http://localhost:3000/set-password?token=t',
      });
      const payload = mockSend.mock.calls[0][0];
      expect(payload.html).not.toContain('<script>alert(1)</script>');
      expect(payload.html).toContain('&lt;script&gt;');
    });
  });

  describe('sendResetEmail', () => {
    it('uses the reset subject + link', async () => {
      process.env.RESEND_API_KEY = 'rs_test';
      mockSend.mockResolvedValue({ data: { id: 'em_3' } });
      await emailService.sendResetEmail({
        to: 'a@b.com',
        fullName: 'Aisha',
        link: 'http://localhost:3000/reset-password?token=t',
      });
      const payload = mockSend.mock.calls[0][0];
      expect(payload.subject).toMatch(/reset your password/i);
      expect(payload.html).toContain('reset-password?token=t');
    });
  });
});
