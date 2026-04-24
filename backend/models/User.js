const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  username: {
    type: String,
    trim: true,
  },
  fullName: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String, // Storing this allows us to revoke access (logout) later
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 🔒 Hash password before saving
userSchema.pre("save", async function () {
  // If the password hasn't been changed, just exit the function
  if (!this.isModified("password")) {
    return;
  }

  // Hash the password securely
  this.password = await bcrypt.hash(this.password, 10);
});

// 🔑 Check if password is correct
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// 🎫 Generate Access Token (Short-lived)
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );
};

// 🎫 Generate Refresh Token (Long-lived)
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );
};

module.exports = mongoose.model("User", userSchema);
