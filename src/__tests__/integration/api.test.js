const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

jest.mock('../../services/inquiryService', () => ({
  createInquiry: jest.fn(),
  getAllInquiries: jest.fn(),
}));

const inquiryService = require('../../services/inquiryService');
const app = require('../../app');

beforeEach(() => {
  inquiryService.createInquiry.mockReset();
  inquiryService.getAllInquiries.mockReset();
});

describe('Health', () => {
  it('GET /api/v1/health returns 200 and status ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.uptime).toBeDefined();
  });

  it('GET /api/v1/health/ready returns 200 or 503 depending on DB state', async () => {
    const res = await request(app).get('/api/v1/health/ready');
    expect([200, 503]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data.ready).toBe(true);
      expect(res.body.data.database).toBe('connected');
    } else {
      expect(res.body.data.ready).toBe(false);
      expect(res.body.data.database).toBeDefined();
    }
  });
});

describe('Auth', () => {
  it('POST /api/v1/auth/login returns 200 and tokens when NODE_ENV=test', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ userId: 'test-user', email: 'test@test.com', role: 'user' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user).toMatchObject({
      id: 'test-user',
      email: 'test@test.com',
      role: 'user',
    });
  });

  it('POST /api/v1/auth/refresh-token returns 400 when refreshToken missing', async () => {
    const res = await request(app).post('/api/v1/auth/refresh-token').send({});
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
  });

  it('POST /api/v1/auth/refresh-token returns 200 with valid refresh token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ userId: 'refresh-user', email: 'refresh@test.com', role: 'user' });
    const refreshToken = loginRes.body.data.refreshToken;

    const res = await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user).toMatchObject({
      id: 'refresh-user',
      email: 'refresh@test.com',
      role: 'user',
    });
  });

  it('GET /api/v1/auth/me returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/auth/me returns 200 with valid token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ userId: 'me-user', email: 'me@test.com', role: 'admin' });
    const token = loginRes.body.data.accessToken;

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      id: 'me-user',
      email: 'me@test.com',
      role: 'admin',
    });
  });
});

describe('Inquiries', () => {
  let authToken;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ userId: 'inquiry-user', email: 'inquiry@test.com', role: 'user' });
    authToken = loginRes.body.data.accessToken;
  });

  it('POST /api/v1/inquiries returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/v1/inquiries')
      .send({
        title: 'T',
        fullName: 'J',
        phoneNumber: { countryCode: '+91', number: '9876543210' },
        referenceNumber: { countryCode: '+91', number: '1111111111' },
        referenceName: 'R',
        typeOfClient: 'I',
        address: 'A',
        clientBehaviour: 'C',
        typeOfBooking: 'B',
      });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/inquiries returns 422 when body invalid', async () => {
    const res = await request(app)
      .post('/api/v1/inquiries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: '' });
    expect(res.status).toBe(422);
    expect(res.body.status).toBe('fail');
    expect(res.body.data.errors).toBeDefined();
  });

  it('POST /api/v1/inquiries returns 201 with valid body', async () => {
    const created = {
      _id: 'mock-id',
      title: 'Travel',
      fullName: 'John Doe',
      referenceNumber: { countryCode: '+91', number: '9999888877' },
    };
    inquiryService.createInquiry.mockResolvedValue(created);

    const res = await request(app)
      .post('/api/v1/inquiries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Travel',
        fullName: 'John Doe',
        phoneNumber: { countryCode: '+91', number: '9876543210' },
        referenceNumber: { countryCode: '+91', number: '9999888877' },
        referenceName: 'Jane',
        typeOfClient: 'Individual',
        address: '123 St',
        clientBehaviour: 'Good',
        typeOfBooking: 'International',
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.inquiry).toBeDefined();
    expect(res.body.data.inquiry.title).toBe('Travel');
    expect(inquiryService.createInquiry).toHaveBeenCalled();
  });

  it('GET /api/v1/inquiries returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/inquiries');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/inquiries returns 200 with token', async () => {
    inquiryService.getAllInquiries.mockResolvedValue({
      items: [],
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 1,
    });

    const res = await request(app)
      .get('/api/v1/inquiries')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data).toMatchObject({
      items: expect.any(Array),
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 1,
    });
    expect(inquiryService.getAllInquiries).toHaveBeenCalled();
  });

  it('GET /api/v1/inquiries?limit=101 returns 422', async () => {
    const res = await request(app)
      .get('/api/v1/inquiries?limit=101')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(422);
  });
});

describe('404', () => {
  it('returns 404 for unknown route', async () => {
    const res = await request(app).get('/api/v1/unknown');
    expect(res.status).toBe(404);
  });
});
