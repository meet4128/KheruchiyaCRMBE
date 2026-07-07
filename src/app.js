const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const rateLimit = require('express-rate-limit');
const swaggerSpec = require('./config/swagger');
const inquiryRoutes = require('./routes/inquiryRoutes');
const amendmentSearchRoutes = require('./routes/amendmentSearchRoutes');
const authRoutes = require('./routes/authRoutes');
const healthRoutes = require('./routes/healthRoutes');
const whatsappWebhookRoutes = require('./routes/whatsappWebhookRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const memberRoutes = require('./routes/memberRoutes');
const passwordPublicRoutes = require('./routes/passwordPublicRoutes');
const globalErrorHandler = require('./middlewares/globalErrorHandler');
const requestTimeout = require('./middlewares/requestTimeout');
const {
  getRequestTimeoutMs,
  getWebhookRequestTimeoutMs,
  getTrustProxySetting,
} = require('./config/httpTimeouts');
const AppError = require('./utils/AppError');
const { messages } = require('./locales');

const app = express();

// Behind nginx / load balancer — client IP + protocol from X-Forwarded-*
app.set('trust proxy', getTrustProxySetting());

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
if (process.env.NODE_ENV !== 'test') {
  app.use('/webhooks/whatsapp', requestTimeout(getWebhookRequestTimeoutMs()));
}
app.use('/webhooks/whatsapp', whatsappJsonParser, whatsappWebhookRoutes);

app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
  app.use('/api/v1', requestTimeout(getRequestTimeoutMs()));
}

// Member document uploads (PDF / images) — served at /uploads/members/<filename>
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Chat-style endpoints the frontend polls frequently — excluded from the general
// limiter below and given their own higher budget so polling doesn't 429 the UI.
const isMessagesPollingPath = (path) =>
  /\/whatsapp\/conversations(\/|$)/.test(path) ||
  /\/amendments\/(session\/)?[^/]+\/messages$/.test(path);

// Rate limiting: 100 requests per 15 min per IP (general); off in test to avoid flaky parallel runs
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'error', message: messages.rateLimit.tooManyRequests },
  skip: (req) => isMessagesPollingPath(req.path),
});
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/v1/', generalLimiter);
}

// Messages/conversations polling: 120 requests per minute per IP (chat UI polls every few seconds)
const messagesPollingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { status: 'error', message: messages.rateLimit.tooManyRequests },
});
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/v1/whatsapp/conversations', messagesPollingLimiter);
  app.use(
    /^\/api\/v1\/inquiries\/[^/]+\/amendments\/(session\/)?[^/]+\/messages$/,
    messagesPollingLimiter
  );
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

// Invite resend: 5 per minute per IP to prevent email-blast abuse (passwordflow.md §10)
const resendInviteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { status: 'error', message: messages.rateLimit.tooManyResendInviteAttempts },
});
if (process.env.NODE_ENV !== 'test') {
  app.use(/^\/api\/v1\/members\/[^/]+\/invitations\/resend$/, resendInviteLimiter);
}

// set-password / reset-password: 10 attempts per 15 min per IP (token guesser protection)
const setPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: 'error', message: messages.rateLimit.tooManyRequests },
});
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/v1/auth/set-password', setPasswordLimiter);
  app.use('/api/v1/auth/reset-password', setPasswordLimiter);
}

// forgot-password: 5 per 15 min per IP — combined with always-200 to thwart enumeration
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { status: 'error', message: messages.rateLimit.tooManyForgotAttempts },
});
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/v1/auth/forgot-password', forgotPasswordLimiter);
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
app.use('/api/v1/amendments', amendmentSearchRoutes);
app.use('/api/v1/members', memberRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);

// Public password pages (dev / until Flutter web hosts these routes)
app.use(passwordPublicRoutes);

// 404 handler
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler (catches errors from asyncHandler)
app.use(globalErrorHandler);

module.exports = app;
