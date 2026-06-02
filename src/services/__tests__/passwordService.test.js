const passwordService = require('../passwordService');
const AppError = require('../../utils/AppError');
const { messages } = require('../../locales');

describe('passwordService', () => {
  describe('assertStrong', () => {
    it('rejects passwords shorter than 8 chars', () => {
      expect(() => passwordService.assertStrong('Ab1')).toThrow(AppError);
      try {
        passwordService.assertStrong('Ab1');
      } catch (e) {
        expect(e.statusCode).toBe(422);
        expect(e.errors[0].field).toBe('password');
        expect(e.errors[0].message).toBe(messages.validation.password.lengthInvalid);
      }
    });

    it('rejects passwords longer than 128 chars', () => {
      const tooLong = 'a1' + 'x'.repeat(127);
      expect(() => passwordService.assertStrong(tooLong)).toThrow(AppError);
    });

    it('rejects passwords without a digit', () => {
      try {
        passwordService.assertStrong('abcdefgh');
      } catch (e) {
        expect(e.statusCode).toBe(422);
        expect(e.errors[0].message).toBe(messages.validation.password.strengthInvalid);
      }
    });

    it('rejects passwords without a letter', () => {
      expect(() => passwordService.assertStrong('12345678')).toThrow(AppError);
    });

    it('rejects non-string input', () => {
      expect(() => passwordService.assertStrong(undefined)).toThrow(AppError);
      expect(() => passwordService.assertStrong(null)).toThrow(AppError);
      expect(() => passwordService.assertStrong(12345678)).toThrow(AppError);
    });

    it('accepts a valid password with letter + digit', () => {
      expect(() => passwordService.assertStrong('Secret123')).not.toThrow();
      expect(() => passwordService.assertStrong('a1aaaaaa')).not.toThrow();
    });
  });

  describe('hashPassword / comparePassword', () => {
    it('hashes a password and verifies it', async () => {
      const hash = await passwordService.hashPassword('Secret123');
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe('Secret123');
      expect(hash.length).toBeGreaterThan(20);

      const ok = await passwordService.comparePassword('Secret123', hash);
      const bad = await passwordService.comparePassword('Wrong123', hash);
      expect(ok).toBe(true);
      expect(bad).toBe(false);
    }, 15000);

    it('comparePassword returns false for invalid inputs', async () => {
      expect(await passwordService.comparePassword('', 'hash')).toBe(false);
      expect(await passwordService.comparePassword('Secret123', '')).toBe(false);
      expect(await passwordService.comparePassword(null, null)).toBe(false);
    });

    it('hashPassword refuses weak passwords up-front', async () => {
      await expect(passwordService.hashPassword('weak')).rejects.toThrow(AppError);
    });
  });
});
