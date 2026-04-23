const express = require("express");
const { compareMonths } = require("../controllers/analysisControllers");

const router = express.Router();

// GET /api/analysis/compare?current=APR&previous=MAR
router.get("/compare", compareMonths);

module.exports = router;
