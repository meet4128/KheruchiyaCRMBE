const validateInquiryStatus = require('../validateInquiryStatus');

const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('validateInquiryStatus', () => {
  it('calls next() for a valid status', () => {
    const req = { body: { status: 'IN_PROGRESS' } };
    const res = {};
    const next = jest.fn();

    validateInquiryStatus(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.status).toBe('IN_PROGRESS');
  });

  it('returns 422 when status is missing', () => {
    const req = { body: {} };
    const res = makeRes();
    const next = jest.fn();

    validateInquiryStatus(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when status is not an allowed value', () => {
    const req = { body: { status: 'NEW' } };
    const res = makeRes();
    const next = jest.fn();

    validateInquiryStatus(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('strips unknown fields', () => {
    const req = { body: { status: 'COMPLETED', extra: 'x' } };
    const res = {};
    const next = jest.fn();

    validateInquiryStatus(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ status: 'COMPLETED' });
  });
});
