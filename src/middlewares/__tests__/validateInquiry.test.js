const validateInquiry = require('../validateInquiry');

describe('validateInquiry', () => {
  const validBody = {
    title: 'Inquiry',
    fullName: 'John Doe',
    phoneNumber: { countryCode: '+91', number: '9876543210' },
    referenceNumber: { countryCode: '+91', number: '1234567890' },
    referenceName: 'Jane',
    typeOfClient: 'Individual',
    address: '123 Main St',
    clientBehaviour: 'Friendly',
    typeOfBooking: 'International',
  };

  it('calls next() when body is valid', () => {
    const req = { body: { ...validBody } };
    const res = {};
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toMatchObject(validBody);
  });

  it('returns 422 when required field is missing', () => {
    const req = { body: { ...validBody, title: '' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'fail',
        data: expect.objectContaining({
          message: expect.any(String),
          errors: expect.any(Array),
        }),
      })
    );
  });

  it('returns 422 when phone number has non-digits', () => {
    const req = { body: { ...validBody, phoneNumber: { countryCode: '+91', number: 'abc123' } } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'fail',
        data: expect.objectContaining({ errors: expect.any(Array) }),
      })
    );
  });
});
