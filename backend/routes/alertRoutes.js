const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const { fetchAlerts } = require("../controllers/alertController");

router.get("/alerts", protect, fetchAlerts);

module.exports = router;
