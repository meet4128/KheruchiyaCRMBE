require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');
const swaggerSpec = require('./config/swagger');
const inquiryRoutes = require('./routes/inquiryRoutes');
const authRoutes = require('./routes/authRoutes');
const globalErrorHandler = require('./middlewares/globalErrorHandler');
const AppError = require('./utils/AppError');
const { messages } = require('./locales');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// MongoDB connection
connectDB();

// Security middleware (CSP disabled so Swagger UI can load - it uses inline scripts)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Rate limiting: 100 requests per 15 min per IP (general)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'error', message: messages.rateLimit.tooManyRequests },
});
app.use('/api/v1/', generalLimiter);

// Stricter limit for login: 5 attempts per 15 min (brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { status: 'error', message: messages.rateLimit.tooManyLoginAttempts },
});
app.use('/api/v1/auth/login', loginLimiter);

// Limit for refresh-token: 20 per 15 min (expected during normal use)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { status: 'error', message: messages.rateLimit.tooManyRefreshAttempts },
});
app.use('/api/v1/auth/refresh-token', refreshLimiter);

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
const healthRoutes = require('./routes/healthRoutes');
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/inquiries', inquiryRoutes);

// 404 handler
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler (catches errors from asyncHandler)
app.use(globalErrorHandler);

const server = app.listen(PORT, HOST, () => {
  const url = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
  console.log(`Server running on port ${PORT}`);
  console.log(`Local:   ${url}`);
  if (HOST === '0.0.0.0') {
    const os = require('os');
    const netInterfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(netInterfaces)) {
      for (const iface of netInterfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(`http://${iface.address}:${PORT}`);
        }
      }
    }
    if (addresses.length) {
      console.log(`Network:  ${addresses.join(', ')}`);
    }
  }
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
