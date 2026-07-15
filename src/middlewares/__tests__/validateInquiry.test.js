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

  it('returns 422 when checklist item is missing priority', () => {
    const req = {
      body: {
        ...validBody,
        checklist: [{ user: [{ _id: 'agent-1', fullName: 'Priya Shah' }], category: 'Docs' }],
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when checklist priority is invalid', () => {
    const req = {
      body: {
        ...validBody,
        checklist: [{ priority: 'URGENT' }],
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when checklist item has valid priority', () => {
    const req = {
      body: {
        ...validBody,
        checklist: [
          {
            priority: 'HIGH',
            user: [
              {
                _id: 'agent-1',
                fullName: 'Priya Shah',
                firstName: 'Priya',
                lastName: 'Shah',
                employeeId: 'EMP-1001',
              },
            ],
          },
        ],
      },
    };
    const res = {};
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.checklist[0].priority).toBe('HIGH');
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

  // ─── Hotel Booking branch ──────────────────────────────────────────────────
  const hotelBody = {
    ...validBody,
    typeOfBooking: 'Hotel Booking',
    hotelBooking: {
      city: 'Goa',
      checkInDate: '2026-08-01T00:00:00.000Z',
      checkOutDate: '2026-08-05T00:00:00.000Z',
      rooms: 2,
      adults: 4,
      propertyType: ['Resort'],
      hotelCategory: ['5 Star'],
      roomViews: ['Sea View', 'Pool View'],
      amenities: ['Swimming Pool', 'Wifi'],
      mealPlan: ['Breakfast & Dinner'],
      transfers: ['Airport Transfers'],
      budgetMin: '20000',
      budgetMax: '40000',
      remark: 'Need connecting rooms',
    },
  };

  it('calls next() for a valid Hotel Booking (no airTicket)', () => {
    const req = { body: { ...hotelBody } };
    const res = {};
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.hotelBooking.city).toBe('Goa');
  });

  it('returns 422 when Hotel Booking is missing hotelBooking', () => {
    const body = { ...hotelBody };
    delete body.hotelBooking;
    const req = { body };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when Hotel Booking also carries an airTicket', () => {
    const req = {
      body: {
        ...hotelBody,
        airTicket: {
          bookingType: 'ONE_WAY',
          flightSegments: [
            {
              from: { code: 'AMD', city: 'Ahmedabad' },
              to: { code: 'DXB', city: 'Dubai' },
              departureDate: '2026-08-01T00:00:00.000Z',
              travellerCount: 2,
              travelClass: 'Economy',
            },
          ],
          remark: 'x',
        },
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when checkOutDate is before checkInDate', () => {
    const req = {
      body: {
        ...hotelBody,
        hotelBooking: {
          ...hotelBody.hotelBooking,
          checkInDate: '2026-08-05T00:00:00.000Z',
          checkOutDate: '2026-08-01T00:00:00.000Z',
        },
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when budgetMax is less than budgetMin', () => {
    const req = {
      body: {
        ...hotelBody,
        hotelBooking: { ...hotelBody.hotelBooking, budgetMin: '40000', budgetMax: '20000' },
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when a hotelBooking list value is not an allowed label', () => {
    const req = {
      body: {
        ...hotelBody,
        hotelBooking: { ...hotelBody.hotelBooking, propertyType: ['Mansion'] },
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when Flight Booking carries a hotelBooking', () => {
    const req = {
      body: {
        ...validBody,
        typeOfBooking: 'Flight Booking',
        airTicket: {
          bookingType: 'ONE_WAY',
          flightSegments: [
            {
              from: { code: 'AMD', city: 'Ahmedabad' },
              to: { code: 'DXB', city: 'Dubai' },
              departureDate: '2026-08-01T00:00:00.000Z',
              travellerCount: 2,
              travelClass: 'Economy',
            },
          ],
          remark: 'x',
        },
        hotelBooking: hotelBody.hotelBooking,
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when Flight Booking is missing airTicket', () => {
    const req = { body: { ...validBody, typeOfBooking: 'Flight Booking' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateInquiry(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });
});
