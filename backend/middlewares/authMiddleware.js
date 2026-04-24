const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  // 1. Grab the Authorization header from the incoming request
  const authHeader = req.header("Authorization");
  console.log("🔐 [AUTH MIDDLEWARE] Authorization Header:", authHeader); // 🚀 Debug: See the raw header

  // 2. Check if the token exists and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // 3. Extract the actual token string
    const token = authHeader.replace("Bearer ", "");
    console.log("🔐 [AUTH MIDDLEWARE] Extracted Token:", token); // 🚀 Debug: See the extracted token
    // 4. Verify the token using your specific Access Token Secret
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("🔐 [AUTH MIDDLEWARE] Decoded Token Payload:", decoded); // 🚀 Debug: See the decoded token payload
    // 5. Attach the decoded user ID to the request object
    // (Note: In your User schema, we saved the ID as '_id' in the token payload)
    req.userId = decoded._id;

    // 6. Move on to the next function (the controller)
    next();
  } catch (error) {
    console.error(
      "🔐 [AUTH MIDDLEWARE] Token verification failed:",
      error.message,
    ); // 🚀 Debug: See the error message
    // If the token is expired or tampered with, reject the request
    res
      .status(401)
      .json({ error: "Invalid or expired token. Please log in again." });
  }
};

module.exports = authMiddleware;
