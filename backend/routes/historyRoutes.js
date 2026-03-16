const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
    getScanHistory,
    getScanById
} = require("../controllers/historyController");

// scan history
router.get("/scans", protect, getScanHistory);

// single scan
router.get("/scans/:id", protect, getScanById);

module.exports = router;
