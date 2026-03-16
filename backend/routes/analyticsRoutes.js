const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
fetchAnalytics,
    fetchThreatTrends,
    fetchThreatTypes
} = require("../controllers/analyticsController");

router.get("/analytics", protect, fetchAnalytics);
router.get("/analytics/trends", protect, fetchThreatTrends);
router.get("/analytics/threat-types", protect, fetchThreatTypes);

module.exports = router;
