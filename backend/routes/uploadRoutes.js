const express = require("express");
const multer = require("multer");
const { uploadFile } = require("../controllers/uploadControllers.js");
const authMiddleware = require("../middlewares/authMiddleware.js");
const rateLimit = require("express-rate-limit");

const router = express.Router();
const upload = multer();
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 upload requests per `window`
  message: {
    error:
      "Too many files uploaded from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

router.post(
  "/upload",
  authMiddleware,
  uploadLimiter,
  upload.single("file"),
  uploadFile,
);

module.exports = router;
