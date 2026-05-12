// backend/routes/exportRoutes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware.js");
const { exportToExcel } = require("../controllers/generateExcelController.js");

// Define the route
router.get("/", authMiddleware, exportToExcel);

module.exports = router;
