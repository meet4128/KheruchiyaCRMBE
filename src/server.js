const fs = require('fs');
const path = require('path');

// Load .env from project root first, then cwd (fills keys missing from first file). Dedupe same path.
const envPaths = [path.join(__dirname, '..', '.env'), path.join(process.cwd(), '.env')];
const loadedEnv = new Set();
for (const p of envPaths) {
  const abs = path.resolve(p);
  if (loadedEnv.has(abs)) continue;
  loadedEnv.add(abs);
  if (fs.existsSync(abs)) {
    require('dotenv').config({ path: abs });
    console.log('[dotenv] loaded', abs);
  }
}

const rootEnvPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(path.resolve(rootEnvPath))) {
  console.warn('[dotenv] No .env at project root:', path.resolve(rootEnvPath));
}

const waVerifyOk =
  typeof process.env.WHATSAPP_VERIFY_TOKEN === 'string' &&
  process.env.WHATSAPP_VERIFY_TOKEN.trim().length > 0;
if (!waVerifyOk) {
  console.warn(
    '[WhatsApp] WHATSAPP_VERIFY_TOKEN is missing or empty — GET /webhooks/whatsapp returns 503 until it is set and the server is restarted.'
  );
} else {
  console.log('[WhatsApp] WHATSAPP_VERIFY_TOKEN is loaded.');
}

const app = require('./app');
const { connectDB } = require('./config/db');
const { logProductionEnvWarnings } = require('./config/validateEnv');

logProductionEnvWarnings();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// MongoDB connection
connectDB();

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
