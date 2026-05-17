const validateMember = require('../validateMember');

describe('validateMember', () => {
  const validBody = {
    fullName: 'Ravi Kumar',
    personalEmail: 'ravi@example.com',
    phoneNumber: { countryCode: '+91', number: '9876543210' },
    homePhoneNumber: { countryCode: '+91', number: '9123456789' },
    addressLine1: 'Flat 1, Example Towers',
    zipCode: '380001',
    city: 'Ahmedabad',
    firstName: 'Ravi',
    lastName: 'Kumar',
    employeeId: 'EMP-1001',
    designation: 'Executive',
    employmentStatus: 'active',
    dateOfJoining: '2024-01-15',
    departmentRoles: [{ department: 'Sales', role: 'Associate' }],
    officePhoneNumber: { countryCode: '+91', number: '9988776655' },
  };

  it('calls next() when body is valid', () => {
    const req = { body: { ...validBody } };
    const res = {};
    const next = jest.fn();

    validateMember(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toMatchObject({
      ...validBody,
      personalEmail: 'ravi@example.com',
      dateOfJoining: expect.any(Date),
    });
  });

  it('returns 422 when required field is missing', () => {
    const req = { body: { ...validBody, fullName: '' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    validateMember(req, res, next);

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
    const req = {
      body: { ...validBody, phoneNumber: { countryCode: '+91', number: 'abc123' } },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'fail',
        data: expect.objectContaining({ errors: expect.any(Array) }),
      })
    );
  });

  it('returns 422 when departmentRoles is empty', () => {
    const req = { body: { ...validBody, departmentRoles: [] } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when document URL is not allowed', () => {
    const req = { body: { ...validBody, panDocumentUrl: 'ftp://host/file.pdf' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 for upload path outside /uploads/members/', () => {
    const req = { body: { ...validBody, panDocumentUrl: '/uploads/other/x.pdf' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('calls next() when document URL is server upload path from document-uploads', () => {
    const req = {
      body: {
        ...validBody,
        aadharDocumentUrl: '/uploads/members/1730000000000-abc12345.pdf',
      },
    };
    const res = {};
    const next = jest.fn();

    validateMember(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.aadharDocumentUrl).toBe('/uploads/members/1730000000000-abc12345.pdf');
  });

  it('calls next() when optional fields and https document URLs are present', () => {
    const req = {
      body: {
        ...validBody,
        gender: 'female',
        maritalStatus: 'married',
        addressLine2: 'Landmark',
        panDocumentUrl: 'https://cdn.example.com/pan.jpg',
      },
    };
    const res = {};
    const next = jest.fn();

    validateMember(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.gender).toBe('female');
    expect(req.body.panDocumentUrl).toBe('https://cdn.example.com/pan.jpg');
  });

  it('returns 422 when gender is invalid', () => {
    const req = { body: { ...validBody, gender: 'other' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when employmentStatus is invalid', () => {
    const req = { body: { ...validBody, employmentStatus: 'freelance' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateMember(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('strips unknown keys including createdBy', () => {
    const req = {
      body: {
        ...validBody,
        createdBy: 'attacker',
        extra: true,
      },
    };
    const res = {};
    const next = jest.fn();

    validateMember(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.createdBy).toBeUndefined();
    expect(req.body.extra).toBeUndefined();
  });
});
