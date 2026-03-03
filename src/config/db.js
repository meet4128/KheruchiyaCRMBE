const mongoose = require('mongoose');

const connectDB = async () => {
  const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
  };

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`[INFO] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('[ERROR] MongoDB connection failed:', error.message);
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
