const express = require("express");
const {
  fetchAndSeedData,
  listTransactions,
  getStatistics,
  getBarChart,
  getPieChart,
  getCombinedData,
} = require("../controllers/transactionController");

const router = express.Router();

router.get("/seed", fetchAndSeedData);
router.get("/list", listTransactions);
router.get("/statistics", getStatistics);
router.get("/bar-chart", getBarChart);
router.get("/pie-chart", getPieChart);
router.get("/combined", getCombinedData);

module.exports = router;
