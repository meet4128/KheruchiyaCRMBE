const paymentService = require('../paymentService');

jest.mock('../../models/PaymentPlan', () => ({
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock('../../models/Inquiry', () => ({
  findById: jest.fn(),
}));

const PaymentPlan = require('../../models/PaymentPlan');
const Inquiry = require('../../models/Inquiry');

const INQUIRY_ID = '507f1f77bcf86cd799439011';
const ID_A = '507f191e810c19729de860ea';
const ID_B = '507f191e810c19729de860eb';

// loadInquiry() → Inquiry.findById(id).lean()
const mockInquiryExists = (extra = {}) =>
  Inquiry.findById.mockReturnValue({
    lean: jest.fn().mockResolvedValue({ _id: INQUIRY_ID, ...extra }),
  });

// savePaymentPlan reads the existing plan via .findOne().lean()
const mockExistingPlanLean = (plan) =>
  PaymentPlan.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(plan) });

// savePaymentPlan writes via .findOneAndUpdate().lean() — capture the $set payload
const mockSaveResult = () => {
  PaymentPlan.findOneAndUpdate.mockReturnValue({
    lean: jest.fn().mockResolvedValue({ _id: 'plan-1' }),
  });
};
const savedInstallments = () => PaymentPlan.findOneAndUpdate.mock.calls[0][1].$set.installments;
const savedVerified = () => PaymentPlan.findOneAndUpdate.mock.calls[0][1].$set.verified;

// Builds a hydrated-plan mock for the verify paths (DocumentArray-like installments).
const makeHydratedPlan = (installments) => {
  const arr = installments.slice();
  arr.id = (id) => arr.find((i) => String(i._id) === String(id)) || null;
  const plan = {
    installments: arr,
    verified: false,
    verifiedAt: null,
    verifiedBy: '',
    save: jest.fn().mockResolvedValue(),
    toObject() {
      return {
        installments: this.installments,
        verified: this.verified,
        verifiedAt: this.verifiedAt,
        verifiedBy: this.verifiedBy,
      };
    },
  };
  return plan;
};

describe('paymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInquiryExists();
  });

  describe('savePaymentPlan', () => {
    const basePayload = {
      totalAmount: 125000,
      numberOfInstallments: 2,
      paymentReceivedTillNow: 0,
      installments: [
        { amount: 75000, mode: 'Cash' },
        { amount: 50000, mode: 'UPI' },
      ],
    };

    it('creates a new plan with all installments PENDING and verified=false', async () => {
      mockExistingPlanLean(null);
      mockSaveResult();

      await paymentService.savePaymentPlan(INQUIRY_ID, basePayload, 'user-1');

      const installments = savedInstallments();
      expect(installments).toHaveLength(2);
      expect(installments.every((i) => i.verificationStatus === 'PENDING')).toBe(true);
      expect(savedVerified()).toBe(false);
    });

    it('preserves a VERIFIED row, edits a PENDING row, and adds a new PENDING row', async () => {
      mockExistingPlanLean({
        installments: [
          {
            _id: ID_A,
            amount: 75000,
            mode: 'Cash',
            verificationStatus: 'VERIFIED',
            verifiedBy: 'acct-1',
          },
          { _id: ID_B, amount: 50000, mode: 'UPI', verificationStatus: 'PENDING' },
        ],
      });
      mockSaveResult();

      const payload = {
        ...basePayload,
        numberOfInstallments: 3,
        installments: [
          { _id: ID_A, amount: 75000, mode: 'Cash' }, // verified, unchanged
          { _id: ID_B, amount: 60000, mode: 'UPI' }, // pending, edited
          { amount: 40000, mode: 'Cheque' }, // brand new
        ],
      };

      await paymentService.savePaymentPlan(INQUIRY_ID, payload, 'user-1');

      const saved = savedInstallments();
      expect(saved).toHaveLength(3);
      // Verified row kept verbatim (incl. audit).
      expect(saved[0]).toMatchObject({ verificationStatus: 'VERIFIED', verifiedBy: 'acct-1' });
      // Edited pending row keeps its id + PENDING and new amount.
      expect(saved[1]).toMatchObject({ _id: ID_B, amount: 60000, verificationStatus: 'PENDING' });
      // New row is PENDING with no id (Mongo assigns one).
      expect(saved[2]).toMatchObject({ amount: 40000, verificationStatus: 'PENDING' });
      expect(saved[2]._id).toBeUndefined();
      expect(savedVerified()).toBe(false);
    });

    it('rejects (409) when a VERIFIED installment is edited', async () => {
      mockExistingPlanLean({
        installments: [{ _id: ID_A, amount: 75000, mode: 'Cash', verificationStatus: 'VERIFIED' }],
      });

      const payload = {
        ...basePayload,
        numberOfInstallments: 1,
        installments: [{ _id: ID_A, amount: 99999, mode: 'Cash' }],
      };

      await expect(
        paymentService.savePaymentPlan(INQUIRY_ID, payload, 'user-1')
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(PaymentPlan.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects (409) when a VERIFIED installment is removed', async () => {
      mockExistingPlanLean({
        installments: [
          { _id: ID_A, amount: 75000, mode: 'Cash', verificationStatus: 'VERIFIED' },
          { _id: ID_B, amount: 50000, mode: 'UPI', verificationStatus: 'PENDING' },
        ],
      });

      const payload = {
        ...basePayload,
        numberOfInstallments: 1,
        installments: [{ _id: ID_B, amount: 50000, mode: 'UPI' }], // dropped verified A
      };

      await expect(
        paymentService.savePaymentPlan(INQUIRY_ID, payload, 'user-1')
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(PaymentPlan.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('derives verified=true when every installment is already VERIFIED and unchanged', async () => {
      mockExistingPlanLean({
        installments: [{ _id: ID_A, amount: 75000, mode: 'Cash', verificationStatus: 'VERIFIED' }],
      });
      mockSaveResult();

      const payload = {
        ...basePayload,
        numberOfInstallments: 1,
        installments: [{ _id: ID_A, amount: 75000, mode: 'Cash' }],
      };

      await paymentService.savePaymentPlan(INQUIRY_ID, payload, 'user-1');
      expect(savedVerified()).toBe(true);
    });

    it("returns the inquiry's inquiryNumber alongside the saved plan", async () => {
      mockInquiryExists({ inquiryNumber: 'FT/2627/001' });
      mockExistingPlanLean(null);
      mockSaveResult();

      const result = await paymentService.savePaymentPlan(INQUIRY_ID, basePayload, 'user-1');
      expect(result.inquiryNumber).toBe('FT/2627/001');
    });
  });

  describe('getPaymentPlan', () => {
    it("returns the plan with the inquiry's inquiryNumber", async () => {
      mockInquiryExists({ inquiryNumber: 'HT/2627/002' });
      PaymentPlan.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'plan-1', installments: [] }),
      });

      const result = await paymentService.getPaymentPlan(INQUIRY_ID);
      expect(result).toMatchObject({ _id: 'plan-1', inquiryNumber: 'HT/2627/002' });
    });

    it('throws 404 when no plan exists', async () => {
      PaymentPlan.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      await expect(paymentService.getPaymentPlan(INQUIRY_ID)).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  describe('verifyInstallment', () => {
    it('verifies a single installment and keeps plan.verified false while another is PENDING', async () => {
      const plan = makeHydratedPlan([
        { _id: ID_A, amount: 75000, verificationStatus: 'PENDING' },
        { _id: ID_B, amount: 50000, verificationStatus: 'PENDING' },
      ]);
      PaymentPlan.findOne.mockResolvedValue(plan);

      const result = await paymentService.verifyInstallment(INQUIRY_ID, ID_A, true, 'acct-1');

      expect(plan.installments.id(ID_A).verificationStatus).toBe('VERIFIED');
      expect(plan.installments.id(ID_A).verifiedBy).toBe('acct-1');
      expect(result.verified).toBe(false); // B still pending
      expect(plan.save).toHaveBeenCalled();
    });

    it('sets plan.verified true once the last installment is verified', async () => {
      const plan = makeHydratedPlan([
        { _id: ID_A, amount: 75000, verificationStatus: 'VERIFIED' },
        { _id: ID_B, amount: 50000, verificationStatus: 'PENDING' },
      ]);
      PaymentPlan.findOne.mockResolvedValue(plan);

      const result = await paymentService.verifyInstallment(INQUIRY_ID, ID_B, true, 'acct-1');
      expect(result.verified).toBe(true);
    });

    it('un-verifies an installment back to PENDING', async () => {
      const plan = makeHydratedPlan([{ _id: ID_A, amount: 75000, verificationStatus: 'VERIFIED' }]);
      PaymentPlan.findOne.mockResolvedValue(plan);

      const result = await paymentService.verifyInstallment(INQUIRY_ID, ID_A, false, 'acct-1');
      expect(plan.installments.id(ID_A).verificationStatus).toBe('PENDING');
      expect(result.verified).toBe(false);
    });

    it('throws 404 when the installment id is unknown', async () => {
      const plan = makeHydratedPlan([{ _id: ID_A, verificationStatus: 'PENDING' }]);
      PaymentPlan.findOne.mockResolvedValue(plan);

      await expect(
        paymentService.verifyInstallment(INQUIRY_ID, ID_B, true, 'acct-1')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 404 when the plan does not exist', async () => {
      PaymentPlan.findOne.mockResolvedValue(null);
      await expect(
        paymentService.verifyInstallment(INQUIRY_ID, ID_A, true, 'acct-1')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 400 for an invalid installment id', async () => {
      await expect(
        paymentService.verifyInstallment(INQUIRY_ID, 'not-an-id', true, 'acct-1')
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('verifyPaymentPlan (verify all)', () => {
    it('cascades VERIFIED to every installment and sets plan.verified true', async () => {
      const plan = makeHydratedPlan([
        { _id: ID_A, verificationStatus: 'PENDING' },
        { _id: ID_B, verificationStatus: 'PENDING' },
      ]);
      PaymentPlan.findOne.mockResolvedValue(plan);

      const result = await paymentService.verifyPaymentPlan(INQUIRY_ID, true, 'acct-1');
      expect(plan.installments.every((i) => i.verificationStatus === 'VERIFIED')).toBe(true);
      expect(result.verified).toBe(true);
    });

    it('cascades PENDING to every installment when un-verifying', async () => {
      const plan = makeHydratedPlan([
        { _id: ID_A, verificationStatus: 'VERIFIED' },
        { _id: ID_B, verificationStatus: 'VERIFIED' },
      ]);
      PaymentPlan.findOne.mockResolvedValue(plan);

      const result = await paymentService.verifyPaymentPlan(INQUIRY_ID, false, 'acct-1');
      expect(plan.installments.every((i) => i.verificationStatus === 'PENDING')).toBe(true);
      expect(result.verified).toBe(false);
    });
  });
});
