const inquiryService = require('../inquiryService');

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
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
  };
});

jest.mock('../memberService', () => ({
  getMemberById: jest.fn(),
}));

jest.mock('../counterService', () => ({
  getNextSequence: jest.fn().mockResolvedValue(1),
}));

const Inquiry = require('../../models/Inquiry');
const memberService = require('../memberService');
const counterService = require('../counterService');

const VALID_INQUIRY_ID = '507f1f77bcf86cd799439011';
const VALID_MEMBER_ID = '507f191e810c19729de860ea';

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

    it('allows duplicate reference numbers (no uniqueness check)', async () => {
      const saved = { _id: 'new-id', ...validPayload };
      Inquiry.create.mockResolvedValue(saved);

      const result = await inquiryService.createInquiry(validPayload);

      expect(result).toEqual(saved);
      // Reference number is no longer looked up before creating.
      expect(Inquiry.findOne).not.toHaveBeenCalled();
      expect(Inquiry.create).toHaveBeenCalledWith(expect.objectContaining(validPayload));
    });

    it('assigns an inquiryNumber from the shared atomic counter', async () => {
      counterService.getNextSequence.mockResolvedValueOnce(7);
      Inquiry.create.mockImplementation((payload) =>
        Promise.resolve({ _id: 'new-id', ...payload })
      );

      // typeOfBooking 'Flight Booking' → prefix FT; seq 7 → padded '007'.
      const payload = { ...validPayload, typeOfBooking: 'Flight Booking' };
      await inquiryService.createInquiry(payload);

      expect(counterService.getNextSequence).toHaveBeenCalledWith('inquiryNumber');
      expect(Inquiry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          inquiryNumber: expect.stringMatching(/^FT\/\d{4}\/007$/),
        })
      );
    });

    it('auto-sets checklist dueDate from priority when dueDate is omitted', async () => {
      Inquiry.findOne.mockResolvedValue(null);
      Inquiry.create.mockImplementation((payload) =>
        Promise.resolve({ _id: 'new-id', ...payload })
      );

      const baseTime = new Date('2026-06-12T10:00:00.000Z');
      jest.useFakeTimers().setSystemTime(baseTime);

      const payload = {
        ...validPayload,
        checklist: [{ priority: 'MEDIUM', user: [{ _id: 'agent-1', fullName: 'Priya Shah' }] }],
      };

      await inquiryService.createInquiry(payload);

      expect(Inquiry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          checklist: [
            expect.objectContaining({
              priority: 'MEDIUM',
              dueDate: new Date('2026-06-12T18:00:00.000Z'),
            }),
          ],
        })
      );

      jest.useRealTimers();
    });

    it('keeps explicit checklist dueDate when provided', async () => {
      Inquiry.findOne.mockResolvedValue(null);
      Inquiry.create.mockImplementation((payload) =>
        Promise.resolve({ _id: 'new-id', ...payload })
      );

      const customDueDate = new Date('2026-07-01T12:00:00.000Z');
      const payload = {
        ...validPayload,
        checklist: [{ priority: 'HIGH', dueDate: customDueDate }],
      };

      await inquiryService.createInquiry(payload);

      expect(Inquiry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          checklist: [
            expect.objectContaining({
              priority: 'HIGH',
              dueDate: customDueDate,
            }),
          ],
        })
      );
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

    it('scopes a non-admin caller to unassigned + self-assigned inquiries', async () => {
      await inquiryService.getAllInquiries({}, { role: 'sales', id: VALID_MEMBER_ID });

      expect(Inquiry.find).toHaveBeenCalledWith({
        $and: [{}, { $or: [{ assignedTo: null }, { 'assignedTo._id': VALID_MEMBER_ID }] }],
      });
    });

    it('does NOT scope an admin caller (sees all inquiries)', async () => {
      await inquiryService.getAllInquiries({}, { role: 'admin', id: VALID_MEMBER_ID });

      expect(Inquiry.find).toHaveBeenCalledWith({});
    });
  });

  describe('assignInquiry', () => {
    const member = {
      _id: VALID_MEMBER_ID,
      fullName: 'Priya Shah',
      firstName: 'Priya',
      lastName: 'Shah',
      employeeId: 'EMP-1001',
    };

    it('assigns the inquiry with a member snapshot and returns the updated doc', async () => {
      memberService.getMemberById.mockResolvedValue(member);
      const updated = { _id: VALID_INQUIRY_ID, assignedTo: member };
      Inquiry.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await inquiryService.assignInquiry(VALID_INQUIRY_ID, VALID_MEMBER_ID);

      expect(memberService.getMemberById).toHaveBeenCalledWith(VALID_MEMBER_ID);
      expect(Inquiry.findByIdAndUpdate).toHaveBeenCalledWith(
        VALID_INQUIRY_ID,
        {
          $set: {
            assignedTo: {
              _id: VALID_MEMBER_ID,
              fullName: 'Priya Shah',
              firstName: 'Priya',
              lastName: 'Shah',
              employeeId: 'EMP-1001',
            },
          },
        },
        { new: true, runValidators: true }
      );
      expect(result).toBe(updated);
    });

    it('throws 400 for an invalid inquiry id', async () => {
      await expect(
        inquiryService.assignInquiry('not-an-id', VALID_MEMBER_ID)
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(memberService.getMemberById).not.toHaveBeenCalled();
    });

    it('throws 404 when the inquiry does not exist', async () => {
      memberService.getMemberById.mockResolvedValue(member);
      Inquiry.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        inquiryService.assignInquiry(VALID_INQUIRY_ID, VALID_MEMBER_ID)
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('updateInquiryStatus', () => {
    it('updates the status and returns the updated doc', async () => {
      const updated = { _id: VALID_INQUIRY_ID, status: 'IN_PROGRESS' };
      Inquiry.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await inquiryService.updateInquiryStatus(VALID_INQUIRY_ID, 'IN_PROGRESS');

      expect(Inquiry.findByIdAndUpdate).toHaveBeenCalledWith(
        VALID_INQUIRY_ID,
        { $set: { status: 'IN_PROGRESS' } },
        { new: true, runValidators: true }
      );
      expect(result).toBe(updated);
    });

    it('throws 400 for an invalid inquiry id', async () => {
      await expect(
        inquiryService.updateInquiryStatus('not-an-id', 'PENDING')
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(Inquiry.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('throws 404 when the inquiry does not exist', async () => {
      Inquiry.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        inquiryService.updateInquiryStatus(VALID_INQUIRY_ID, 'COMPLETED')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });
});
