require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');

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
