const validateMemberUpdate = require('../validateMemberUpdate');

describe('validateMemberUpdate', () => {
  it('calls next() when one field is present', () => {
    const req = { body: { firstName: 'Jane' } };
    const res = {};
    const next = jest.fn();

    validateMemberUpdate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ firstName: 'Jane' });
  });

  it('returns 422 when body is empty', () => {
    const req = { body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateMemberUpdate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when departmentRoles is empty array', () => {
    const req = { body: { departmentRoles: [] } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateMemberUpdate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('strips unknown keys', () => {
    const req = { body: { designation: 'Lead', createdBy: 'x' } };
    const res = {};
    const next = jest.fn();

    validateMemberUpdate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.createdBy).toBeUndefined();
  });
});
