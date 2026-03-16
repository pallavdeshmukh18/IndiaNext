const express = require("express");
const router = express.Router();

const { fetchAlerts } = require("../controllers/alertController");

router.get("/alerts", fetchAlerts);

module.exports = router;