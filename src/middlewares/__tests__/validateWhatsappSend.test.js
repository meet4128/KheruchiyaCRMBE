const validateWhatsappSend = require('../validateWhatsappSend');

describe('validateWhatsappSend', () => {
  const base = { to: '919876543210' };

  it('accepts template message for business-initiated outbound', () => {
    const req = {
      body: {
        ...base,
        type: 'template',
        template: {
          name: 'customer_greeting',
          language: 'en',
          bodyParams: ['Meet'],
        },
      },
    };
    const res = {};
    const next = jest.fn();

    validateWhatsappSend(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.type).toBe('template');
    expect(req.body.template.name).toBe('customer_greeting');
  });

  it('returns 422 when type is template but template object missing', () => {
    const req = { body: { ...base, type: 'template' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateWhatsappSend(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 422 when template name has invalid characters', () => {
    const req = {
      body: {
        ...base,
        type: 'template',
        template: { name: 'Hello World', language: 'en' },
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validateWhatsappSend(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });
});
