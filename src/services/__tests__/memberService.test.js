const memberService = require('../memberService');
const { messages } = require('../../locales');

jest.mock('../../models/Member', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
}));

const Member = require('../../models/Member');

describe('memberService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMember', () => {
    const validPayload = {
      fullName: 'Ravi Kumar',
      personalEmail: 'ravi@example.com',
      phoneNumber: { countryCode: '+91', number: '9876543210' },
      homePhoneNumber: { countryCode: '+91', number: '9123456789' },
      addressLine1: 'Flat 1',
      zipCode: '380001',
      city: 'Ahmedabad',
      firstName: 'Ravi',
      lastName: 'Kumar',
      employeeId: 'EMP-1001',
      designation: 'Executive',
      employmentStatus: 'active',
      dateOfJoining: new Date('2024-01-15'),
      departmentRoles: [{ department: 'Sales', role: 'Associate' }],
      officePhoneNumber: { countryCode: '+91', number: '9988776655' },
      createdBy: 'user-1',
    };

    it('throws 409 when employee ID already exists', async () => {
      Member.findOne.mockResolvedValueOnce({ _id: 'existing' });

      await expect(memberService.createMember(validPayload)).rejects.toMatchObject({
        statusCode: 409,
        message: messages.errors.employeeIdExists,
      });

      expect(Member.findOne).toHaveBeenCalledWith({ employeeId: 'EMP-1001' });
      expect(Member.create).not.toHaveBeenCalled();
    });

    it('throws 409 when personal email already exists', async () => {
      Member.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: 'email-dup' });

      await expect(memberService.createMember(validPayload)).rejects.toMatchObject({
        statusCode: 409,
        message: messages.errors.personalEmailExists,
      });

      expect(Member.findOne).toHaveBeenNthCalledWith(2, { personalEmail: 'ravi@example.com' });
      expect(Member.create).not.toHaveBeenCalled();
    });

    it('creates member when employee ID and email are unique', async () => {
      Member.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      const saved = { _id: 'new-id', ...validPayload };
      Member.create.mockResolvedValue(saved);

      const result = await memberService.createMember(validPayload);

      expect(result).toEqual(saved);
      expect(Member.create).toHaveBeenCalledWith(validPayload);
    });
  });

  describe('updateMember', () => {
    const id = '507f1f77bcf86cd799439011';

    it('throws 400 when id is not a valid ObjectId', async () => {
      await expect(memberService.updateMember('bad-id', { firstName: 'A' })).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(Member.findById).not.toHaveBeenCalled();
    });

    it('throws 404 when member does not exist', async () => {
      Member.findById.mockResolvedValue(null);

      await expect(memberService.updateMember(id, { firstName: 'A' })).rejects.toMatchObject({
        statusCode: 404,
        message: messages.errors.memberNotFound,
      });

      expect(Member.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('throws 409 when employeeId is taken by another member', async () => {
      Member.findById.mockResolvedValue({
        _id: id,
        employeeId: 'OLD',
        personalEmail: 'same@example.com',
      });
      Member.findOne.mockResolvedValueOnce({ _id: 'other' });

      await expect(memberService.updateMember(id, { employeeId: 'NEW-EMP' })).rejects.toMatchObject(
        {
          statusCode: 409,
          message: messages.errors.employeeIdExists,
        }
      );
    });

    it('throws 409 when personalEmail is taken by another member', async () => {
      Member.findById.mockResolvedValue({
        _id: id,
        employeeId: 'E1',
        personalEmail: 'old@example.com',
      });
      Member.findOne.mockResolvedValue({ _id: 'other' });

      await expect(
        memberService.updateMember(id, { personalEmail: 'taken@example.com' })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: messages.errors.personalEmailExists,
      });
    });

    it('updates member when valid', async () => {
      Member.findById.mockResolvedValue({
        _id: id,
        employeeId: 'E1',
        personalEmail: 'e@example.com',
      });
      Member.findByIdAndUpdate.mockResolvedValue({
        _id: id,
        firstName: 'Updated',
      });

      const result = await memberService.updateMember(id, { firstName: 'Updated' });

      expect(result.firstName).toBe('Updated');
      expect(Member.findByIdAndUpdate).toHaveBeenCalledWith(
        id,
        { $set: { firstName: 'Updated' } },
        { new: true, runValidators: true }
      );
    });
  });

  describe('getMembers', () => {
    it('returns paginated result with defaults', async () => {
      const chain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      Member.find.mockReturnValue(chain);
      Member.countDocuments.mockResolvedValue(0);

      const result = await memberService.getMembers({});

      expect(result).toMatchObject({
        items: [],
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1,
      });
      expect(Member.find).toHaveBeenCalledWith({});
    });

    it('filters by employmentStatus and city', async () => {
      const chain = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      Member.find.mockReturnValue(chain);
      Member.countDocuments.mockResolvedValue(0);

      await memberService.getMembers({ employmentStatus: 'active', city: 'Ahmedabad' });

      expect(Member.find).toHaveBeenCalledWith(
        expect.objectContaining({ employmentStatus: 'active', city: 'Ahmedabad' })
      );
    });
  });

  describe('getMembersDirectory', () => {
    it('filters by department and defaults to active employment', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{ fullName: 'Priya', departmentRoles: [] }]),
      };
      Member.find.mockReturnValue(chain);
      Member.countDocuments.mockResolvedValue(1);

      const result = await memberService.getMembersDirectory({ department: 'Purchase' });

      expect(Member.find).toHaveBeenCalledWith(
        expect.objectContaining({
          employmentStatus: 'active',
          departmentRoles: {
            $elemMatch: { department: /^Purchase$/i },
          },
        })
      );
      expect(chain.select).toHaveBeenCalled();
      expect(result.department).toBe('Purchase');
      expect(result.items).toHaveLength(1);
    });

    it('filters by department and role when role is provided', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      Member.find.mockReturnValue(chain);
      Member.countDocuments.mockResolvedValue(0);

      await memberService.getMembersDirectory({ department: 'Purchase', role: 'Manager' });

      expect(Member.find).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentRoles: {
            $elemMatch: {
              department: /^Purchase$/i,
              role: /^Manager$/i,
            },
          },
        })
      );
    });
  });

  describe('deleteMember', () => {
    const id = '507f1f77bcf86cd799439011';

    it('throws 400 when id is not a valid ObjectId', async () => {
      await expect(memberService.deleteMember('bad-id')).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(Member.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('throws 404 when member does not exist', async () => {
      Member.findByIdAndDelete.mockResolvedValue(null);

      await expect(memberService.deleteMember(id)).rejects.toMatchObject({
        statusCode: 404,
        message: messages.errors.memberNotFound,
      });
    });

    it('deletes member when valid id exists', async () => {
      const deleted = { _id: id, fullName: 'Ravi Kumar' };
      Member.findByIdAndDelete.mockResolvedValue(deleted);

      const result = await memberService.deleteMember(id);

      expect(result).toEqual(deleted);
      expect(Member.findByIdAndDelete).toHaveBeenCalledWith(id);
    });
  });
});
