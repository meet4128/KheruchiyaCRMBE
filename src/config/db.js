const mongoose = require('mongoose');
const { messages } = require('../locales');

const connectDB = async () => {
  const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    // Auto-retry a single transient failure instead of surfacing a rejection during
    // brief Atlas failovers/network blips (the churn behind the earlier crash loop).
    retryWrites: true,
    retryReads: true,
  };

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`[INFO] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('[ERROR] MongoDB connection failed:', error.message);
    if (
      error.message.includes('IP') ||
      error.message.includes('whitelist') ||
      error.message.includes('Network')
    ) {
      console.error(`\n[FIX] ${messages.db.fixNetworkAccess}`);
      console.error(`  ${messages.db.fixStep1}`);
      console.error(`  ${messages.db.fixStep2}`);
      console.error(`  ${messages.db.fixStep3}`);
      console.error(`  ${messages.db.fixStep4}\n`);
    }
    process.exit(1);
  }
};

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log('[INFO] MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('[ERROR] MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[WARN] MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('[INFO] MongoDB reconnected');
});

module.exports = { connectDB };
