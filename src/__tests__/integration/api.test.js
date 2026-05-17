const request = require('supertest');
const crypto = require('crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

jest.mock('../../services/inquiryService', () => ({
  createInquiry: jest.fn(),
  getAllInquiries: jest.fn(),
  getInquiryById: jest.fn(),
}));

jest.mock('../../services/memberService', () => ({
  createMember: jest.fn(),
  updateMember: jest.fn(),
  getMembers: jest.fn(),
  deleteMember: jest.fn(),
}));

jest.mock('../../services/whatsappService', () => {
  const actual = jest.requireActual('../../services/whatsappService');
  return {
    ...actual,
    sendMessage: jest.fn(),
    sendTextMessage: jest.fn(),
    getConversations: jest.fn(),
    getMessagesByPeer: jest.fn(),
  };
});

jest.mock('../../services/amendmentService', () => ({
  finalizeAmendment: jest.fn(),
  listAmendmentsByInquiry: jest.fn(),
  getAmendment: jest.fn(),
  getAmendmentMessages: jest.fn(),
  getSessionMessages: jest.fn(),
  getAmendmentNotes: jest.fn(),
  addSessionNote: jest.fn(),
  uploadSessionFile: jest.fn(),
  registerActiveSession: jest.fn(),
  loadInquiry: jest.fn(),
  phoneToPeer: jest.fn(),
}));

const inquiryService = require('../../services/inquiryService');
const memberService = require('../../services/memberService');
const whatsappService = require('../../services/whatsappService');
const amendmentService = require('../../services/amendmentService');
const AppError = require('../../utils/AppError');
const { messages } = require('../../locales');
const app = require('../../app');

beforeEach(() => {
  inquiryService.createInquiry.mockReset();
  inquiryService.getAllInquiries.mockReset();
  inquiryService.getInquiryById.mockReset();
  memberService.createMember.mockReset();
  memberService.updateMember.mockReset();
  memberService.getMembers.mockReset();
  memberService.deleteMember.mockReset();
  whatsappService.sendMessage.mockReset();
  whatsappService.sendTextMessage.mockReset();
  whatsappService.getConversations.mockReset();
  whatsappService.getMessagesByPeer.mockReset();
  amendmentService.finalizeAmendment.mockReset();
  amendmentService.listAmendmentsByInquiry.mockReset();
  amendmentService.getAmendment.mockReset();
  amendmentService.getAmendmentMessages.mockReset();
  amendmentService.addSessionNote.mockReset();
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

  it('POST /api/v1/auth/login returns 422 for invalid role', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ userId: 'test-user', email: 'test@test.com', role: 'manager' });
    expect(res.status).toBe(422);
    expect(res.body.status).toBe('fail');
    expect(res.body.data.allowedRoles).toEqual(['admin', 'sales', 'purchase', 'user']);
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

  it('GET /api/v1/inquiries/:id returns 200 with amendment metadata', async () => {
    inquiryService.getInquiryById.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      fullName: 'Hardik',
      amendments: [{ amendmentId: 'TAIR123', status: 'pending' }],
    });
    const res = await request(app)
      .get('/api/v1/inquiries/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.inquiry.amendments).toHaveLength(1);
  });

  it('GET /api/v1/inquiries?limit=101 returns 422', async () => {
    const res = await request(app)
      .get('/api/v1/inquiries?limit=101')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(422);
  });
});

describe('Members', () => {
  let adminToken;
  let userToken;

  const memberDocId = '507f1f77bcf86cd799439011';

  const validMemberBody = {
    fullName: 'Ravi Kumar',
    personalEmail: 'ravi.member@test.com',
    phoneNumber: { countryCode: '+91', number: '9876543210' },
    homePhoneNumber: { countryCode: '+91', number: '9123456789' },
    addressLine1: 'Flat 1',
    zipCode: '380001',
    city: 'Ahmedabad',
    firstName: 'Ravi',
    lastName: 'Kumar',
    employeeId: 'EMP-INT-001',
    designation: 'Executive',
    employmentStatus: 'active',
    dateOfJoining: '2024-01-15',
    departmentRoles: [{ department: 'Sales', role: 'Associate' }],
    officePhoneNumber: { countryCode: '+91', number: '9988776655' },
  };

  beforeAll(async () => {
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ userId: 'member-admin', email: 'member-admin@test.com', role: 'admin' });
    adminToken = adminLogin.body.data.accessToken;

    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ userId: 'member-plain-user', email: 'member-plain@test.com', role: 'user' });
    userToken = userLogin.body.data.accessToken;
  });

  it('POST /api/v1/members returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/members').send(validMemberBody);
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/members returns 403 when JWT user is not admin', async () => {
    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${userToken}`)
      .send(validMemberBody);

    expect(res.status).toBe(403);
    expect(res.body.data.message).toBe(messages.auth.insufficientRole);
    expect(memberService.createMember).not.toHaveBeenCalled();
  });

  it('POST /api/v1/members returns 422 when body invalid', async () => {
    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validMemberBody, fullName: '' });
    expect(res.status).toBe(422);
    expect(res.body.status).toBe('fail');
    expect(res.body.data.errors).toBeDefined();
  });

  it('POST /api/v1/members returns 201 with valid body (admin)', async () => {
    const created = { _id: 'member-mock-id', ...validMemberBody, createdBy: 'member-admin' };
    memberService.createMember.mockResolvedValue(created);

    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validMemberBody);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.member).toBeDefined();
    expect(res.body.data.member.fullName).toBe('Ravi Kumar');
    expect(memberService.createMember).toHaveBeenCalledWith({
      ...validMemberBody,
      personalEmail: 'ravi.member@test.com',
      dateOfJoining: expect.any(Date),
      createdBy: 'member-admin',
    });
  });

  it('POST /api/v1/members returns 201 with multipart/form-data and document file (admin)', async () => {
    const phone = JSON.stringify({ countryCode: '+91', number: '9876543210' });
    const home = JSON.stringify({ countryCode: '+91', number: '9123456789' });
    const office = JSON.stringify({ countryCode: '+91', number: '9988776655' });
    const roles = JSON.stringify([{ department: 'Sales', role: 'Associate' }]);

    const created = {
      _id: 'member-multipart',
      employeeId: 'EMP-MULTI-FORM-1',
      aadharDocumentUrl: '/uploads/members/placeholder.pdf',
      createdBy: 'member-admin',
    };
    memberService.createMember.mockResolvedValue(created);

    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('fullName', 'Form Data User')
      .field('personalEmail', 'formdata.member@test.com')
      .field('phoneNumber', phone)
      .field('homePhoneNumber', home)
      .field('addressLine1', 'Line 1')
      .field('zipCode', '380001')
      .field('city', 'Ahmedabad')
      .field('firstName', 'Form')
      .field('lastName', 'Data')
      .field('employeeId', 'EMP-MULTI-FORM-1')
      .field('designation', 'Staff')
      .field('employmentStatus', 'active')
      .field('dateOfJoining', '2024-06-01')
      .field('departmentRoles', roles)
      .field('officePhoneNumber', office)
      .attach('aadharCard', Buffer.from('%PDF-1.4\n%EOF\n'), 'aadhar.pdf');

    expect(res.status).toBe(201);
    expect(memberService.createMember).toHaveBeenCalled();
    const payload = memberService.createMember.mock.calls[0][0];
    expect(payload.aadharDocumentUrl).toMatch(/^\/uploads\/members\/.*\.pdf$/i);
    expect(payload.phoneNumber).toEqual({ countryCode: '+91', number: '9876543210' });
    expect(payload.departmentRoles).toEqual([{ department: 'Sales', role: 'Associate' }]);

    const fs = require('fs');
    const path = require('path');
    try {
      fs.unlinkSync(path.join(process.cwd(), payload.aadharDocumentUrl.replace(/^\//, '')));
    } catch (_e) {
      /* ignore */
    }
  });

  it('POST /api/v1/members returns 201 with optional fields (admin)', async () => {
    const withOptionals = {
      ...validMemberBody,
      employeeId: 'EMP-INT-002',
      gender: 'male',
      addressLine2: 'Near park',
      panDocumentUrl: 'https://storage.example.com/docs/pan.png',
    };
    const created = { _id: 'member-mock-2', ...withOptionals, createdBy: 'member-admin' };
    memberService.createMember.mockResolvedValue(created);

    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(withOptionals);

    expect(res.status).toBe(201);
    expect(res.body.data.member.panDocumentUrl).toBe('https://storage.example.com/docs/pan.png');
    expect(memberService.createMember).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'EMP-INT-002',
        gender: 'male',
        panDocumentUrl: 'https://storage.example.com/docs/pan.png',
        createdBy: 'member-admin',
      })
    );
  });

  it('POST /api/v1/members returns 409 when employee ID exists', async () => {
    memberService.createMember.mockRejectedValue(
      new AppError(messages.errors.employeeIdExists, 409)
    );

    const res = await request(app)
      .post('/api/v1/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validMemberBody);

    expect(res.status).toBe(409);
    expect(res.body.status).toBe('fail');
    expect(res.body.data.message).toBe(messages.errors.employeeIdExists);
  });

  it('PATCH /api/v1/members/:id returns 403 when not admin', async () => {
    const res = await request(app)
      .patch(`/api/v1/members/${memberDocId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ firstName: 'X' });

    expect(res.status).toBe(403);
    expect(memberService.updateMember).not.toHaveBeenCalled();
  });

  it('PATCH /api/v1/members/:id returns 200 when admin', async () => {
    const updated = { _id: memberDocId, firstName: 'Updated' };
    memberService.updateMember.mockResolvedValue(updated);

    const res = await request(app)
      .patch(`/api/v1/members/${memberDocId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.data.member.firstName).toBe('Updated');
    expect(memberService.updateMember).toHaveBeenCalledWith(memberDocId, { firstName: 'Updated' });
  });

  it('PATCH /api/v1/members/:id accepts multipart with only a document file (admin)', async () => {
    const updated = { _id: memberDocId, panDocumentUrl: '/uploads/members/x.jpg' };
    memberService.updateMember.mockResolvedValue(updated);

    const res = await request(app)
      .patch(`/api/v1/members/${memberDocId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('panCard', Buffer.from('\xff\xd8\xff'), 'pan.jpg');

    expect(res.status).toBe(200);
    const call = memberService.updateMember.mock.calls[0];
    expect(call[0]).toBe(memberDocId);
    expect(call[1].panDocumentUrl).toMatch(/^\/uploads\/members\/.*\.jpe?g$/i);

    const fs = require('fs');
    const path = require('path');
    try {
      fs.unlinkSync(path.join(process.cwd(), call[1].panDocumentUrl.replace(/^\//, '')));
    } catch (_e) {
      /* ignore */
    }
  });

  it('PATCH /api/v1/members/:id returns 422 when body is empty', async () => {
    const res = await request(app)
      .patch(`/api/v1/members/${memberDocId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('PATCH /api/v1/members/:id returns 404 when service reports not found', async () => {
    memberService.updateMember.mockRejectedValue(new AppError(messages.errors.memberNotFound, 404));

    const res = await request(app)
      .patch(`/api/v1/members/${memberDocId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ designation: 'Lead' });

    expect(res.status).toBe(404);
  });

  it('POST /api/v1/members/document-uploads returns 403 when not admin', async () => {
    const res = await request(app)
      .post('/api/v1/members/document-uploads')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('aadharCard', Buffer.from('%PDF-1.4\n'), 'aadhar.pdf');

    expect(res.status).toBe(403);
  });

  it('POST /api/v1/members/document-uploads returns 400 when no files', async () => {
    const res = await request(app)
      .post('/api/v1/members/document-uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('_noop', '1');

    expect(res.status).toBe(400);
    expect(res.body.data.message).toBe(messages.validation.member.documentUploadAtLeastOne);
  });

  it('POST /api/v1/members/document-uploads returns 200 with paths (admin)', async () => {
    const fs = require('fs');
    const path = require('path');

    const res = await request(app)
      .post('/api/v1/members/document-uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('aadharCard', Buffer.from('%PDF-1.4\n%EOF\n'), 'aadhar.pdf')
      .attach('panCard', Buffer.from('\xff\xd8\xff'), 'pan.jpg');

    expect(res.status).toBe(200);
    expect(res.body.data.urls.aadharDocumentUrl).toMatch(/^\/uploads\/members\/.*\.pdf$/i);
    expect(res.body.data.urls.panDocumentUrl).toMatch(/^\/uploads\/members\/.*\.jpe?g$/i);

    for (const rel of Object.values(res.body.data.urls)) {
      const abs = path.join(process.cwd(), String(rel).replace(/^\//, ''));
      try {
        fs.unlinkSync(abs);
      } catch (_e) {
        /* ignore */
      }
    }
  });

  it('GET serves uploaded member document', async () => {
    const fs = require('fs');
    const path = require('path');

    const up = await request(app)
      .post('/api/v1/members/document-uploads')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('cancelCheque', Buffer.from('%PDF-1.1'), 'cheque.pdf');

    expect(up.status).toBe(200);
    const urlPath = up.body.data.urls.cancelChequeDocumentUrl;
    const getRes = await request(app).get(urlPath);
    expect([200, 304]).toContain(getRes.status);

    try {
      fs.unlinkSync(path.join(process.cwd(), urlPath.replace(/^\//, '')));
    } catch (_e) {
      /* ignore */
    }
  });

  it('GET /api/v1/members returns 403 when not admin', async () => {
    const res = await request(app)
      .get('/api/v1/members')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/v1/members returns 200 with paginated data (admin)', async () => {
    memberService.getMembers.mockResolvedValue({
      items: [{ _id: 'm1', fullName: 'Ravi Kumar' }],
      page: 1,
      limit: 10,
      totalItems: 1,
      totalPages: 1,
    });

    const res = await request(app)
      .get('/api/v1/members?page=1&limit=10&search=ravi')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.items).toHaveLength(1);
    expect(memberService.getMembers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10, search: 'ravi' })
    );
  });

  it('GET /api/v1/members returns 422 for invalid query', async () => {
    const res = await request(app)
      .get('/api/v1/members?limit=101')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(422);
  });

  it('DELETE /api/v1/members/:id returns 403 when not admin', async () => {
    const res = await request(app)
      .delete(`/api/v1/members/${memberDocId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
    expect(memberService.deleteMember).not.toHaveBeenCalled();
  });

  it('DELETE /api/v1/members/:id returns 200 when admin', async () => {
    memberService.deleteMember.mockResolvedValue({ _id: memberDocId, fullName: 'Deleted Name' });

    const res = await request(app)
      .delete(`/api/v1/members/${memberDocId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.member._id).toBe(memberDocId);
    expect(memberService.deleteMember).toHaveBeenCalledWith(memberDocId);
  });

  it('DELETE /api/v1/members/:id returns 404 when service reports not found', async () => {
    memberService.deleteMember.mockRejectedValue(new AppError(messages.errors.memberNotFound, 404));

    const res = await request(app)
      .delete(`/api/v1/members/${memberDocId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('fail');
  });
});

describe('404', () => {
  it('returns 404 for unknown route', async () => {
    const res = await request(app).get('/api/v1/unknown');
    expect(res.status).toBe(404);
  });
});

describe('WhatsApp webhook', () => {
  const prevVerify = process.env.WHATSAPP_VERIFY_TOKEN;
  const prevSecret = process.env.WHATSAPP_APP_SECRET;

  afterEach(() => {
    if (prevVerify === undefined) {
      delete process.env.WHATSAPP_VERIFY_TOKEN;
    } else {
      process.env.WHATSAPP_VERIFY_TOKEN = prevVerify;
    }
    if (prevSecret === undefined) {
      delete process.env.WHATSAPP_APP_SECRET;
    } else {
      process.env.WHATSAPP_APP_SECRET = prevSecret;
    }
  });

  it('GET /webhooks/whatsapp returns 503 when WHATSAPP_VERIFY_TOKEN is unset', async () => {
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    const res = await request(app)
      .get('/webhooks/whatsapp')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'any', 'hub.challenge': 'x' });
    expect(res.status).toBe(503);
  });

  it('GET /webhooks/whatsapp returns hub.challenge when token matches', async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token';
    const res = await request(app).get('/webhooks/whatsapp').query({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'test-verify-token',
      'hub.challenge': 'challenge-value-123',
    });
    expect(res.status).toBe(200);
    expect(res.text).toBe('challenge-value-123');
  });

  it('GET /webhooks/whatsapp returns 403 when verify token mismatches', async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'correct';
    const res = await request(app).get('/webhooks/whatsapp').query({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'wrong',
      'hub.challenge': 'x',
    });
    expect(res.status).toBe(403);
  });

  it('POST /webhooks/whatsapp returns 200 without signature when WHATSAPP_APP_SECRET unset', async () => {
    delete process.env.WHATSAPP_APP_SECRET;
    const body = { object: 'whatsapp_business_account', entry: [] };
    const res = await request(app).post('/webhooks/whatsapp').send(body);
    expect(res.status).toBe(200);
  });

  it('POST /webhooks/whatsapp returns 403 when signature invalid', async () => {
    process.env.WHATSAPP_APP_SECRET = 'secret-for-test';
    const body = { object: 'whatsapp_business_account', entry: [] };
    const raw = JSON.stringify(body);
    const res = await request(app)
      .post('/webhooks/whatsapp')
      .set('X-Hub-Signature-256', 'sha256=deadbeef')
      .send(body);
    expect(res.status).toBe(403);
    expect(raw.length).toBeGreaterThan(0);
  });

  it('POST /webhooks/whatsapp returns 200 when signature valid', async () => {
    process.env.WHATSAPP_APP_SECRET = 'secret-for-test';
    const body = { object: 'whatsapp_business_account', entry: [] };
    const raw = JSON.stringify(body);
    const sig =
      'sha256=' + crypto.createHmac('sha256', 'secret-for-test').update(raw).digest('hex');
    const res = await request(app)
      .post('/webhooks/whatsapp')
      .set('X-Hub-Signature-256', sig)
      .send(body);
    expect(res.status).toBe(200);
  });
});

describe('WhatsApp send', () => {
  let authToken;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ userId: 'wa-user', email: 'wa@test.com', role: 'sales' });
    authToken = loginRes.body.data.accessToken;
  });

  it('POST /api/v1/whatsapp/send returns 403 for non-sales role', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ userId: 'wa-user2', email: 'wa2@test.com', role: 'user' });
    const res = await request(app)
      .post('/api/v1/whatsapp/send')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
      .send({ to: '919876543210', text: 'Hi' });
    expect(res.status).toBe(403);
  });

  it('POST /api/v1/whatsapp/send returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/v1/whatsapp/send')
      .send({ to: '919876543210', text: 'Hi' });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/whatsapp/send returns 422 when body invalid', async () => {
    const res = await request(app)
      .post('/api/v1/whatsapp/send')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ to: 'abc', text: '' });
    expect(res.status).toBe(422);
  });

  it('POST /api/v1/whatsapp/send returns 200 when service succeeds', async () => {
    whatsappService.sendMessage.mockResolvedValue({ messages: [{ id: 'wamid.test' }] });
    const res = await request(app)
      .post('/api/v1/whatsapp/send')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ to: '919876543210', text: 'Flight option A' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.graph.messages[0].id).toBe('wamid.test');
    expect(whatsappService.sendMessage).toHaveBeenCalled();
  });
});

describe('WhatsApp conversations', () => {
  let authToken;

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ userId: 'wa-conv-user', email: 'waconv@test.com', role: 'user' });
    authToken = loginRes.body.data.accessToken;
  });

  it('GET /api/v1/whatsapp/conversations returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/whatsapp/conversations');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/whatsapp/conversations returns 200 with paginated data', async () => {
    whatsappService.getConversations.mockResolvedValue({
      items: [
        {
          peerPhone: '919876543210',
          messageCount: 2,
          lastMessage: { text: 'Hi', direction: 'inbound' },
        },
      ],
      page: 1,
      limit: 10,
      totalItems: 1,
      totalPages: 1,
    });
    const res = await request(app)
      .get('/api/v1/whatsapp/conversations')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].peerPhone).toBe('919876543210');
  });

  it('GET /api/v1/whatsapp/conversations/:peerPhone/messages returns 422 for invalid peer', async () => {
    const res = await request(app)
      .get('/api/v1/whatsapp/conversations/not-a-phone/messages')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(422);
  });

  it('GET /api/v1/whatsapp/conversations/:peerPhone/messages returns 200', async () => {
    whatsappService.getMessagesByPeer.mockResolvedValue({
      peerPhone: '919876543210',
      items: [{ wamid: 'wamid.1', text: 'Hello', direction: 'inbound' }],
      page: 1,
      limit: 50,
      totalItems: 1,
      totalPages: 1,
    });
    const res = await request(app)
      .get('/api/v1/whatsapp/conversations/919876543210/messages')
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.peerPhone).toBe('919876543210');
    expect(whatsappService.getMessagesByPeer).toHaveBeenCalledWith(
      '919876543210',
      expect.objectContaining({ page: 1, limit: 50 })
    );
  });
});

describe('Amendments', () => {
  let salesToken;
  const inquiryId = '507f1f77bcf86cd799439011';

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ userId: 'sales-emp', email: 'sales@test.com', role: 'sales' });
    salesToken = loginRes.body.data.accessToken;
  });

  it('POST finalize returns 403 for user role', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ userId: 'u1', email: 'u1@test.com', role: 'user' });
    const res = await request(app)
      .post(`/api/v1/inquiries/${inquiryId}/amendments/finalize`)
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`)
      .send({ action: 'mark_pending', amendmentType: 're_issue' });
    expect(res.status).toBe(403);
  });

  it('POST finalize returns 201 for sales', async () => {
    amendmentService.finalizeAmendment.mockResolvedValue({
      amendmentId: 'TAIR999',
      status: 'pending',
      amendmentType: 're_issue',
    });
    const res = await request(app)
      .post(`/api/v1/inquiries/${inquiryId}/amendments/finalize`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ action: 'mark_pending', amendmentType: 're_issue' });
    expect(res.status).toBe(201);
    expect(res.body.data.amendment.amendmentId).toBe('TAIR999');
  });

  it('POST finalize returns 422 when mark_won without amount', async () => {
    const res = await request(app)
      .post(`/api/v1/inquiries/${inquiryId}/amendments/finalize`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ action: 'mark_won', amendmentType: 'booking' });
    expect(res.status).toBe(422);
  });

  it('GET amendments list returns 200', async () => {
    amendmentService.listAmendmentsByInquiry.mockResolvedValue([
      { amendmentId: 'TAIR1', status: 'loss' },
    ]);
    const res = await request(app)
      .get(`/api/v1/inquiries/${inquiryId}/amendments`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.amendments).toHaveLength(1);
    expect(res.body.data.amendments[0].questionAndAnswer).toBeUndefined();
  });
});
