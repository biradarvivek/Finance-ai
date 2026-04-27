const express = require("express");
const {
  compareMonths,
  getAvailableMonths,
  getDashboardStatus,
  calculateDynamicTotal,
} = require("../controllers/analysisControllers");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

// GET /api/analysis/compare?current=APR&previous=MAR
router.get("/compare", authMiddleware, compareMonths);
router.get("/months", authMiddleware, getAvailableMonths);
router.get("/status", authMiddleware, getDashboardStatus);
// 👈 2. Add the Agent Route (Protected by Auth!)
router.get("/agent/query", authMiddleware, calculateDynamicTotal);

module.exports = router;
