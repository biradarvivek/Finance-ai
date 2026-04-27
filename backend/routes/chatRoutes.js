const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getChatHistory,
  askQuestion,
} = require("../controllers/chatControllers");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // Limit each IP to 20 chat requests per `window`
  message: {
    error: "You are asking questions too quickly! Please wait a few minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/history", authMiddleware, getChatHistory);
router.get("/", authMiddleware, chatLimiter, askQuestion);

module.exports = router;
