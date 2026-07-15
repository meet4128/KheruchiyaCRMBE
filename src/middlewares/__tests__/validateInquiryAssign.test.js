const validateInquiryAssign = require('../validateInquiryAssign');

const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

describe('validateInquiryAssign', () => {
  it('calls next() for a valid member id', () => {
    const req = { body: { userId: '507f191e810c19729de860ea' } };
    const res = {};
    const next = jest.fn();

    validateInquiryAssign(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.userId).toBe('507f191e810c19729de860ea');
  });

  it('returns 422 when userId is missing', () => {
    const req = { body: {} };
    const res = makeRes();
    const next = jest.fn();

    validateInquiryAssign(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when userId is not a valid ObjectId', () => {
    const req = { body: { userId: 'agent-1' } };
    const res = makeRes();
    const next = jest.fn();

    validateInquiryAssign(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('strips unknown fields', () => {
    const req = { body: { userId: '507f191e810c19729de860ea', role: 'admin' } };
    const res = {};
    const next = jest.fn();

    validateInquiryAssign(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ userId: '507f191e810c19729de860ea' });
  });
});
