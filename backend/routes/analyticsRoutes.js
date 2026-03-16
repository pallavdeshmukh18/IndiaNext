const express = require("express");
const router = express.Router();

const {
fetchAnalytics,
    fetchThreatTrends,
    fetchThreatTypes
} = require("../controllers/analyticsController");

router.get("/analytics", fetchAnalytics);
router.get("/analytics/trends", fetchThreatTrends);
router.get("/analytics/threat-types", fetchThreatTypes);

module.exports = router;
