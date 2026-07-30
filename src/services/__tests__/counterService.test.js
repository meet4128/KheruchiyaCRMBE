const counterService = require('../counterService');

jest.mock('../../models/Counter', () => ({
  findOneAndUpdate: jest.fn(),
}));

const Counter = require('../../models/Counter');

describe('counterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('atomically increments and returns the next sequence', async () => {
    Counter.findOneAndUpdate.mockResolvedValue({ _id: 'inquiryNumber', seq: 5 });

    const seq = await counterService.getNextSequence('inquiryNumber');

    expect(seq).toBe(5);
    expect(Counter.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'inquiryNumber' },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  });
});
