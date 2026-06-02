const PurchaseTeamChat = require('../../models/PurchaseTeamChat');
const PurchaseTeamChatMessage = require('../../models/PurchaseTeamChatMessage');
const Member = require('../../models/Member');
const Inquiry = require('../../models/Inquiry');
const purchaseTeamChatService = require('../purchaseTeamChatService');
const AppError = require('../../utils/AppError');

jest.mock('../../models/PurchaseTeamChat');
jest.mock('../../models/PurchaseTeamChatMessage');
jest.mock('../../models/Member');
jest.mock('../../models/Inquiry');

describe('purchaseTeamChatService', () => {
  const inquiryId = '507f1f77bcf86cd799439011';
  const memberId = '507f1f77bcf86cd799439012';

  beforeEach(() => {
    jest.clearAllMocks();
    Inquiry.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: inquiryId }),
    });
    Member.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: memberId,
        departmentRoles: [{ department: 'Purchase', role: 'Executive' }],
      }),
    });
  });

  it('sendMessage creates message and updates thread', async () => {
    const messageDoc = {
      toObject: () => ({
        _id: 'msg1',
        text: 'Hello purchase',
        senderRole: 'sales',
      }),
    };
    PurchaseTeamChatMessage.create.mockResolvedValue(messageDoc);
    PurchaseTeamChat.findOneAndUpdate.mockResolvedValue({});

    const result = await purchaseTeamChatService.sendMessage(
      inquiryId,
      memberId,
      { type: 'text', text: 'Hello purchase' },
      { id: 'sales-1', role: 'sales' }
    );

    expect(result.text).toBe('Hello purchase');
    expect(PurchaseTeamChatMessage.create).toHaveBeenCalled();
    expect(PurchaseTeamChat.findOneAndUpdate).toHaveBeenCalled();
  });

  it('rejects non-purchase member', async () => {
    Member.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: memberId,
        departmentRoles: [{ department: 'Sales', role: 'Associate' }],
      }),
    });

    await expect(
      purchaseTeamChatService.sendMessage(
        inquiryId,
        memberId,
        { type: 'text', text: 'Hi' },
        { id: 'sales-1', role: 'sales' }
      )
    ).rejects.toThrow(AppError);
  });
});
