const express = require("express");
const multer = require("multer");
const { uploadFile } = require("../controllers/uploadControllers.js");

const router = express.Router();
const upload = multer();

router.post("/upload", upload.single("file"), uploadFile);

module.exports = router;
