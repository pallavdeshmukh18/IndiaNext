const express = require("express");
const router = express.Router();

const {
    getScanHistory,
    getScanById
} = require("../controllers/historyController");

// scan history
router.get("/scans", getScanHistory);

// single scan
router.get("/scans/:id", getScanById);

module.exports = router;