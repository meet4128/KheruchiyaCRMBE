const validateInquiryQuery = require('../validateInquiryQuery');

describe('validateInquiryQuery', () => {
  it('calls next() and sets default page/limit when query is empty', () => {
    const req = { query: {} };
    const res = {};
    const next = jest.fn();

    validateInquiryQuery(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query).toMatchObject({ page: 1, limit: 10 });
  });

  it('converts string page/limit to numbers', () => {
    const req = { query: { page: '2', limit: '20' } };
    const res = {};
    const next = jest.fn();

    validateInquiryQuery(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.page).toBe(2);
    expect(req.query.limit).toBe(20);
  });

  it('returns 422 when limit exceeds 100', () => {
    const req = { query: { limit: 101 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateInquiryQuery(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'fail',
        data: expect.objectContaining({ errors: expect.any(Array) }),
      })
    );
  });

  it('returns 422 when page is less than 1', () => {
    const req = { query: { page: 0 } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateInquiryQuery(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('accepts valid status enum', () => {
    const req = { query: { status: 'PENDING' } };
    const res = {};
    const next = jest.fn();

    validateInquiryQuery(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query.status).toBe('PENDING');
  });
});
