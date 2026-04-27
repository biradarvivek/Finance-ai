const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Helper function to generate and save both tokens
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    console.log("Generating tokens for user ID:", userId);
    const user = await User.findById(userId);
    console.log("User found for token generation:", user);
    const accessToken = user.generateAccessToken();
    console.log("Access Token generated:", accessToken);
    const refreshToken = user.generateRefreshToken();
    console.log("Refresh Token generated:", refreshToken);

    // Save refresh token to database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); // Skip validation on token save

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("❌ TOKEN GENERATION ERROR:", error);
    throw new Error("Something went wrong while generating tokens");
  }
};

// 1. SIGNUP
exports.register = async (req, res) => {
  try {
    const { email, username, fullName, password } = req.body;
    console.log("Registration Data:", { email, username, fullName, password });

    const existingUser = await User.findOne({ email });
    console.log("Existing User Check:", existingUser);
    if (existingUser)
      return res.status(400).json({ error: "Email already in use." });

    // Create the user (The pre-save hook in User.js automatically hashes the password!)
    const newUser = await User.create({
      email,
      username,
      fullName,
      password,
    });

    console.log("New User Created:", newUser);

    // Generate Tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      newUser._id,
    );

    console.log("Generated Tokens:", { accessToken, refreshToken });

    // Remove password and refresh token from the response object
    const createdUser = await User.findById(newUser._id).select(
      "-password -refreshToken",
    );
    console.log("User Data Sent to Client:", createdUser);

    res.status(201).json({
      user: createdUser,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("❌ CRITICAL CRASH DURING USER CREATION:", error);
    res
      .status(500)
      .json({ error: "Registration failed.", details: error.message });
  }
};

// 2. LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "Invalid email or password." });

    // Use the schema method to check the password
    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch)
      return res.status(400).json({ error: "Invalid email or password." });

    // Generate Tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id,
    );

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken",
    );

    res.json({
      user: loggedInUser,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed.", details: error.message });
  }
};

// 3. REFRESH TOKEN
exports.refreshAccessToken = async (req, res) => {
  try {
    // 1. Grab the refresh token from the request body
    const incomingRefreshToken = req.body.refreshToken;
    console.log("Received Refresh Token:", incomingRefreshToken); // 🚀 Debug: See the incoming refresh token

    if (!incomingRefreshToken) {
      return res.status(401).json({ error: "Refresh token is missing." });
    }

    // 2. Verify the token hasn't been tampered with or expired
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    // 3. Find the user in the database
    const user = await User.findById(decodedToken._id);

    if (!user) {
      return res.status(401).json({ error: "Invalid refresh token." });
    }

    // 4. Critical Security Check: Ensure the token matches the one in the database
    // This allows you to instantly log a user out of all devices by clearing the DB token
    if (incomingRefreshToken !== user.refreshToken) {
      return res
        .status(401)
        .json({ error: "Refresh token is expired or has been revoked." });
    }

    // 5. Generate a fresh set of tokens
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    res.status(200).json({
      accessToken,
      refreshToken: newRefreshToken,
      message: "Access token refreshed successfully",
    });
  } catch (error) {
    console.error("Refresh Token Error:", error.message);
    res.status(401).json({ error: "Invalid or expired refresh token." });
  }
};
