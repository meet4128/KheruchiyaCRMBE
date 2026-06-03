const { messages } = require('../locales');

/**
 * Aborts slow requests with 408 before the load balancer / nginx times out opaquely.
 */
function requestTimeout(ms) {
  const limit = Math.max(parseInt(ms, 10) || 120_000, 1000);

  return (req, res, next) => {
    let finished = false;

    const timer = setTimeout(() => {
      if (finished || res.headersSent) return;
      finished = true;
      res.status(408).json({
        status: 'error',
        message: messages.errors.requestTimeout,
      });
    }, limit);

    const clear = () => {
      finished = true;
      clearTimeout(timer);
    };

    res.on('finish', clear);
    res.on('close', clear);
    next();
  };
}

module.exports = requestTimeout;
