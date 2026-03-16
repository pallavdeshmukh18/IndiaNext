const express = require("express");
const router = express.Router();
const { saveScanResult } = require("../services/logService");

router.post("/test-scan", async (req, res) => {
    try {

        const saved = await saveScanResult(req.body);

        res.json({
            message: "Scan stored successfully",
            data: saved
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
});

module.exports = router;