const inquiryService = require('../inquiryService');
const AppError = require('../../utils/AppError');

jest.mock('../../models/Inquiry', () => {
  const chain = {
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(() => chain),
    countDocuments: jest.fn().mockResolvedValue(0),
  };
});

const Inquiry = require('../../models/Inquiry');

describe('inquiryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createInquiry', () => {
    const validPayload = {
      title: 'Test',
      fullName: 'John',
      phoneNumber: { countryCode: '+91', number: '9876543210' },
      referenceNumber: { countryCode: '+91', number: '1234567890' },
      referenceName: 'Jane',
      typeOfClient: 'Individual',
      address: '123 St',
      clientBehaviour: 'Good',
      typeOfBooking: 'International',
      createdBy: 'user-1',
    };

    it('throws 409 when reference number already exists', async () => {
      Inquiry.findOne.mockResolvedValue({ _id: 'existing' });

      await expect(inquiryService.createInquiry(validPayload)).rejects.toThrow(AppError);
      await expect(inquiryService.createInquiry(validPayload)).rejects.toMatchObject({
        statusCode: 409,
      });

      expect(Inquiry.findOne).toHaveBeenCalledWith({
        'referenceNumber.countryCode': '+91',
        'referenceNumber.number': '1234567890',
      });
      expect(Inquiry.create).not.toHaveBeenCalled();
    });

    it('creates inquiry when reference number is unique', async () => {
      Inquiry.findOne.mockResolvedValue(null);
      const saved = { _id: 'new-id', ...validPayload };
      Inquiry.create.mockResolvedValue(saved);

      const result = await inquiryService.createInquiry(validPayload);

      expect(result).toEqual(saved);
      expect(Inquiry.create).toHaveBeenCalledWith(validPayload);
    });
  });

  describe('getAllInquiries', () => {
    it('returns paginated result with default page and limit', async () => {
      const result = await inquiryService.getAllInquiries({});

      expect(result).toMatchObject({
        items: [],
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1,
      });
    });

    it('respects page and limit params', async () => {
      Inquiry.countDocuments.mockResolvedValue(50);

      const result = await inquiryService.getAllInquiries({ page: 2, limit: 5 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalItems).toBe(50);
      expect(result.totalPages).toBe(10);
    });

    it('filters by status when valid enum provided', async () => {
      await inquiryService.getAllInquiries({ status: 'PENDING' });

      expect(Inquiry.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' }));
    });

    it('ignores invalid status', async () => {
      await inquiryService.getAllInquiries({ status: 'INVALID' });

      expect(Inquiry.find).toHaveBeenCalledWith({});
    });
  });
});
