const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    console.log(
      `Connecting to MongoDB in ${isProduction ? "production" : "development"} mode...`,
    );

    const mongoURI = isProduction
      ? process.env.MONGODB_URI
      : "mongodb://localhost:27017/finance-ai";

    await mongoose.connect(mongoURI);

    console.log("MongoDB connected");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

module.exports = connectDB;
