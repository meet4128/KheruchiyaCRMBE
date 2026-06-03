const requestTimeout = require('../requestTimeout');

describe('requestTimeout middleware', () => {
  it('returns 408 when response does not finish before limit', (done) => {
    jest.useFakeTimers();
    const mw = requestTimeout(1000);
    const req = {};
    const res = {
      headersSent: false,
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        expect(this.statusCode).toBe(408);
        expect(body.message).toMatch(/timed out/i);
        jest.useRealTimers();
        done();
      },
      on() {},
    };

    mw(req, res, () => {});
    jest.advanceTimersByTime(1001);
  });
});
