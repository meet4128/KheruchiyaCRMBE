const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const rateLimit = require('express-rate-limit');
const swaggerSpec = require('./config/swagger');
const inquiryRoutes = require('./routes/inquiryRoutes');
const authRoutes = require('./routes/authRoutes');
const healthRoutes = require('./routes/healthRoutes');
const whatsappWebhookRoutes = require('./routes/whatsappWebhookRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const memberRoutes = require('./routes/memberRoutes');
const globalErrorHandler = require('./middlewares/globalErrorHandler');
const AppError = require('./utils/AppError');
const { messages } = require('./locales');

const app = express();

// Security middleware (CSP disabled so Swagger UI can load - it uses inline scripts)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// WhatsApp webhook: JSON parser with raw body for X-Hub-Signature-256 (mounted before /api/v1 rate limit)
const whatsappJsonParser = express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
});
app.use('/webhooks/whatsapp', whatsappJsonParser, whatsappWebhookRoutes);

app.use(express.json());

// Member document uploads (PDF / images) — served at /uploads/members/<filename>
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rate limiting: 100 requests per 15 min per IP (general); off in test to avoid flaky parallel runs
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'error', message: messages.rateLimit.tooManyRequests },
});
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/v1/', generalLimiter);
}

// Stricter limit for login: 5 attempts per 15 min (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { status: 'error', message: messages.rateLimit.tooManyLoginAttempts },
});
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/v1/auth/login', loginLimiter);
}

// Limit for refresh-token: 20 per 15 min (expected during normal use)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: 'error', message: messages.rateLimit.tooManyRefreshAttempts },
});
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/v1/auth/refresh-token', refreshLimiter);
}

// Swagger API docs
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Kheruchiya CRM API Docs',
  })
);

// API routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/inquiries', inquiryRoutes);
app.use('/api/v1/members', memberRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);

// 404 handler
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler (catches errors from asyncHandler)
app.use(globalErrorHandler);

module.exports = app;
