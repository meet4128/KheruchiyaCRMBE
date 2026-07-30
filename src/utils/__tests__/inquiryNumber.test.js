const {
  resolvePrefix,
  getFinancialYearSegment,
  formatSequence,
  buildInquiryNumber,
} = require('../inquiryNumber');

describe('inquiryNumber util', () => {
  describe('resolvePrefix', () => {
    it('maps known booking types', () => {
      expect(resolvePrefix('Flight Booking')).toBe('FT');
      expect(resolvePrefix('Hotel Booking')).toBe('HT');
    });

    it('falls back to IN for unknown/missing types', () => {
      expect(resolvePrefix('Cruise Booking')).toBe('IN');
      expect(resolvePrefix(undefined)).toBe('IN');
    });
  });

  describe('getFinancialYearSegment', () => {
    it('uses start year when month >= April', () => {
      expect(getFinancialYearSegment(new Date('2026-07-30T12:00:00.000Z'))).toBe('2627');
    });

    it('uses previous start year when month < April', () => {
      expect(getFinancialYearSegment(new Date('2027-02-15T12:00:00.000Z'))).toBe('2627');
    });

    it('rolls to the next FY on April 1', () => {
      expect(getFinancialYearSegment(new Date('2027-04-01T12:00:00.000Z'))).toBe('2728');
    });

    it('applies the Asia/Kolkata boundary (UTC just before IST midnight April 1)', () => {
      // 2027-03-31T20:00Z == 2027-04-01T01:30 IST → already FY 2027–28.
      expect(getFinancialYearSegment(new Date('2027-03-31T20:00:00.000Z'))).toBe('2728');
    });
  });

  describe('formatSequence', () => {
    it('zero-pads to at least 3 digits', () => {
      expect(formatSequence(1)).toBe('001');
      expect(formatSequence(42)).toBe('042');
    });

    it('grows naturally past 999', () => {
      expect(formatSequence(1000)).toBe('1000');
    });
  });

  describe('buildInquiryNumber', () => {
    it('composes PREFIX/FY/SEQ', () => {
      expect(
        buildInquiryNumber({
          typeOfBooking: 'Flight Booking',
          seq: 1,
          date: new Date('2026-07-30T12:00:00.000Z'),
        })
      ).toBe('FT/2627/001');
    });

    it('uses the fallback prefix for unknown types', () => {
      expect(
        buildInquiryNumber({
          typeOfBooking: 'Something New',
          seq: 129,
          date: new Date('2027-04-01T12:00:00.000Z'),
        })
      ).toBe('IN/2728/129');
    });
  });
});
