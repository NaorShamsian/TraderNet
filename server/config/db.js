const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    console.log("Attempting to connect to primary Atlas MongoDB...");
    const conn = await mongoose.connect(uri);
    console.log(`Primary MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`Primary Atlas database unreachable: ${error.message}`);
    console.log("Attempting automatic fallback to local MongoDB instance (127.0.0.1)...");
    try {
      const conn = await mongoose.connect("mongodb://127.0.0.1:27017/tradernet");
      console.log(`Local MongoDB connected successfully: ${conn.connection.host}`);
    } catch (localError) {
      console.error(`Local MongoDB fallback also failed: ${localError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
