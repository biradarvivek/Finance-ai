const express = require("express");
const {
  compareMonths,
  getAvailableMonths,
} = require("../controllers/analysisControllers");

const router = express.Router();

// GET /api/analysis/compare?current=APR&previous=MAR
router.get("/compare", compareMonths);
router.get("/months", getAvailableMonths);

module.exports = router;
