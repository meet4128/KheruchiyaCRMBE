const amendmentService = require('../amendmentService');
const { AMENDMENT_ACTION } = require('../../constants/amendmentAction');
const { AMENDMENT_TYPE } = require('../../constants/amendmentType');

jest.mock('../../models/Inquiry', () => ({
  findById: jest.fn(),
}));

jest.mock('../../models/Amendment', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../../models/AmendmentMessage', () => ({
  updateMany: jest.fn(),
  create: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../../models/AmendmentNote', () => ({
  updateMany: jest.fn(),
  insertMany: jest.fn(),
  create: jest.fn(),
}));

jest.mock('../../models/AmendmentActiveSession', () => ({
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../../models/PaymentPlan', () => ({
  findOne: jest.fn(),
}));

const Inquiry = require('../../models/Inquiry');
const Amendment = require('../../models/Amendment');
const AmendmentMessage = require('../../models/AmendmentMessage');
const AmendmentNote = require('../../models/AmendmentNote');
const AmendmentActiveSession = require('../../models/AmendmentActiveSession');
const PaymentPlan = require('../../models/PaymentPlan');

// Helper: PaymentPlan.findOne(...).select(...).lean() resolves to `plan`.
const mockPaymentPlan = (plan) => {
  PaymentPlan.findOne.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(plan),
    }),
  });
};

describe('amendmentService.finalizeAmendment', () => {
  const inquiryId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    jest.clearAllMocks();
    Inquiry.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: inquiryId,
        phoneNumber: { countryCode: '91', number: '9876543210' },
      }),
    });
    Amendment.create.mockResolvedValue({
      toObject: () => ({
        amendmentId: 'TAIR123',
        status: 'pending',
        amendmentType: AMENDMENT_TYPE.RE_ISSUE,
      }),
    });
    AmendmentMessage.updateMany.mockResolvedValue({});
    AmendmentNote.updateMany.mockResolvedValue({});
    AmendmentActiveSession.updateOne.mockResolvedValue({});
  });

  it('creates amendment on mark_pending without session', async () => {
    const result = await amendmentService.finalizeAmendment(
      inquiryId,
      { action: AMENDMENT_ACTION.MARK_PENDING, amendmentType: AMENDMENT_TYPE.RE_ISSUE },
      'user-1'
    );
    expect(result.amendmentId).toBe('TAIR123');
    expect(Amendment.create).toHaveBeenCalled();
  });

  it('requires amountCharged for mark_won', async () => {
    await expect(
      amendmentService.finalizeAmendment(
        inquiryId,
        { action: AMENDMENT_ACTION.MARK_WON, amendmentType: AMENDMENT_TYPE.BOOKING },
        'user-1'
      )
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('rejects mark_won when the payment plan is not verified', async () => {
    mockPaymentPlan({ verified: false });
    await expect(
      amendmentService.finalizeAmendment(
        inquiryId,
        {
          action: AMENDMENT_ACTION.MARK_WON,
          amendmentType: AMENDMENT_TYPE.BOOKING,
          amountCharged: 5000,
        },
        'user-1'
      )
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(Amendment.create).not.toHaveBeenCalled();
  });

  it('rejects mark_won when no payment plan exists', async () => {
    mockPaymentPlan(null);
    await expect(
      amendmentService.finalizeAmendment(
        inquiryId,
        {
          action: AMENDMENT_ACTION.MARK_WON,
          amendmentType: AMENDMENT_TYPE.BOOKING,
          amountCharged: 5000,
        },
        'user-1'
      )
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('creates amendment on mark_won when the payment plan is verified', async () => {
    mockPaymentPlan({ verified: true });
    const result = await amendmentService.finalizeAmendment(
      inquiryId,
      {
        action: AMENDMENT_ACTION.MARK_WON,
        amendmentType: AMENDMENT_TYPE.BOOKING,
        amountCharged: 5000,
      },
      'user-1'
    );
    expect(result.amendmentId).toBe('TAIR123');
    expect(Amendment.create).toHaveBeenCalled();
  });
});
