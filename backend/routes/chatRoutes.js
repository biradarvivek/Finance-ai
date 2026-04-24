const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getChatHistory,
  askQuestion,
} = require("../controllers/chatControllers");

const router = express.Router();

router.get("/history", authMiddleware, getChatHistory);
router.get("/", authMiddleware, askQuestion);

module.exports = router;
