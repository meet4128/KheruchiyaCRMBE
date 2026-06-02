const crypto = require('crypto');

jest.mock('../../models/AuthToken', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn(),
}));

const AuthToken = require('../../models/AuthToken');
const authTokenService = require('../authTokenService');
const AppError = require('../../utils/AppError');
const { AUTH_TOKEN_PURPOSE } = require('../../constants/authTokenPurpose');

const sha256Hex = (s) => crypto.createHash('sha256').update(s).digest('hex');

describe('authTokenService', () => {
  const userId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('issueToken', () => {
    it('issues a 64-hex raw token and stores only its sha256 hash', async () => {
      AuthToken.create.mockImplementation(async (doc) => ({ _id: 't1', ...doc }));
      const { rawToken, doc } = await authTokenService.issueToken({
        userId,
        purpose: AUTH_TOKEN_PURPOSE.INVITE,
      });
      expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
      expect(doc.tokenHash).toBe(sha256Hex(rawToken));
      expect(doc.userId).toBe(userId);
      expect(doc.purpose).toBe('invite');
      expect(doc.expiresAt).toBeInstanceOf(Date);
      expect(doc.expiresAt.getTime()).toBeGreaterThan(Date.now() + 70 * 60 * 60 * 1000);
    });

    it('uses 1h TTL for reset purpose by default', async () => {
      AuthToken.create.mockImplementation(async (doc) => ({ _id: 't2', ...doc }));
      const { doc } = await authTokenService.issueToken({
        userId,
        purpose: AUTH_TOKEN_PURPOSE.RESET,
      });
      const diff = doc.expiresAt.getTime() - Date.now();
      expect(diff).toBeGreaterThan(50 * 60 * 1000);
      expect(diff).toBeLessThan(70 * 60 * 1000);
    });

    it('rejects invalid purpose', async () => {
      await expect(authTokenService.issueToken({ userId, purpose: 'nope' })).rejects.toThrow(
        AppError
      );
    });

    it('rejects missing userId', async () => {
      await expect(
        authTokenService.issueToken({ purpose: AUTH_TOKEN_PURPOSE.INVITE })
      ).rejects.toThrow(AppError);
    });
  });

  describe('verifyToken', () => {
    const rawToken = 'a'.repeat(64);
    const tokenHash = sha256Hex(rawToken);

    it('rejects malformed token strings', async () => {
      await expect(
        authTokenService.verifyToken({ rawToken: 'short', purpose: 'invite' })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('rejects when token does not exist', async () => {
      AuthToken.findOne.mockResolvedValue(null);
      await expect(
        authTokenService.verifyToken({ rawToken, purpose: 'invite' })
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(AuthToken.findOne).toHaveBeenCalledWith({ tokenHash, purpose: 'invite' });
    });

    it('rejects already-used tokens', async () => {
      AuthToken.findOne.mockResolvedValue({
        _id: 't1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(
        authTokenService.verifyToken({ rawToken, purpose: 'invite' })
      ).rejects.toMatchObject({ statusCode: 410 });
    });

    it('rejects expired tokens', async () => {
      AuthToken.findOne.mockResolvedValue({
        _id: 't1',
        expiresAt: new Date(Date.now() - 60_000),
      });
      await expect(
        authTokenService.verifyToken({ rawToken, purpose: 'invite' })
      ).rejects.toMatchObject({ statusCode: 410 });
    });

    it('returns the token doc when valid', async () => {
      const doc = { _id: 't1', expiresAt: new Date(Date.now() + 60_000) };
      AuthToken.findOne.mockResolvedValue(doc);
      const result = await authTokenService.verifyToken({ rawToken, purpose: 'invite' });
      expect(result).toBe(doc);
    });
  });

  describe('consumeToken / invalidateOtherTokens', () => {
    it('consumeToken sets usedAt on an unused token', async () => {
      AuthToken.findOneAndUpdate.mockResolvedValue({ _id: 't1', usedAt: new Date() });
      const res = await authTokenService.consumeToken('t1');
      expect(AuthToken.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 't1', usedAt: { $exists: false } },
        { $set: { usedAt: expect.any(Date) } },
        { new: true }
      );
      expect(res).not.toBeNull();
    });

    it('invalidateOtherTokens updates all unused tokens for user+purpose', async () => {
      AuthToken.updateMany.mockResolvedValue({ matchedCount: 2, modifiedCount: 2 });
      const res = await authTokenService.invalidateOtherTokens({
        userId,
        purpose: AUTH_TOKEN_PURPOSE.INVITE,
        exceptId: 't1',
      });
      expect(AuthToken.updateMany).toHaveBeenCalledWith(
        {
          userId,
          purpose: 'invite',
          usedAt: { $exists: false },
          _id: { $ne: 't1' },
        },
        { $set: { usedAt: expect.any(Date) } }
      );
      expect(res.modifiedCount).toBe(2);
    });

    it('invalidateOtherTokens no-ops with no userId', async () => {
      const res = await authTokenService.invalidateOtherTokens({ purpose: 'invite' });
      expect(res).toEqual({ matchedCount: 0, modifiedCount: 0 });
      expect(AuthToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
