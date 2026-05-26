const validateMemberDirectoryQuery = require('../validateMemberDirectoryQuery');

describe('validateMemberDirectoryQuery', () => {
  it('calls next() with defaults when department is provided', () => {
    const req = { query: { department: 'Purchase' } };
    const res = {};
    const next = jest.fn();

    validateMemberDirectoryQuery(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query).toMatchObject({
      department: 'Purchase',
      page: 1,
      limit: 50,
      employmentStatus: 'active',
    });
  });

  it('returns 422 when department is missing', () => {
    const req = { query: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateMemberDirectoryQuery(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('accepts optional role filter', () => {
    const req = { query: { department: 'Purchase', role: 'Executive' } };
    const res = {};
    const next = jest.fn();

    validateMemberDirectoryQuery(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.role).toBe('Executive');
  });
});
