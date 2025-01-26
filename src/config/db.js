const mongoose = require('mongoose')
const { DB_URI } = require('./environments')

const connectDB = async () => {
  try {
    if (!DB_URI) {
      throw new Error('MongoDB connection URL is not defined in environment variables');
    }

    await mongoose.connect(DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Successfully connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
}

module.exports = connectDB
