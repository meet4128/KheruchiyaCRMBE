const validateMemberQuery = require('../validateMemberQuery');

describe('validateMemberQuery', () => {
  it('calls next() and sets default page/limit', () => {
    const req = { query: {} };
    const res = {};
    const next = jest.fn();

    validateMemberQuery(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query).toMatchObject({ page: 1, limit: 10 });
  });

  it('converts string page/limit to numbers', () => {
    const req = { query: { page: '2', limit: '20' } };
    const res = {};
    const next = jest.fn();

    validateMemberQuery(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBe(2);
    expect(req.query.limit).toBe(20);
  });

  it('returns 422 when limit exceeds 100', () => {
    const req = { query: { limit: 101 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateMemberQuery(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('accepts valid employmentStatus', () => {
    const req = { query: { employmentStatus: 'active' } };
    const res = {};
    const next = jest.fn();

    validateMemberQuery(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.employmentStatus).toBe('active');
  });
});
