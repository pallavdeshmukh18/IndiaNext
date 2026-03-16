const ScanLog = require("../models/ScanLog");


const getScanHistory = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        const scans = await ScanLog
            .find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await ScanLog.countDocuments();

        res.json({
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            scans
        });

    } catch (error) {

        res.status(500).json({
            error: "Failed to fetch scan history"
        });

    }
};

module.exports = {
    getScanHistory
};


// GET single scan
const getScanById = async (req, res) => {
    try {

        const scan = await ScanLog.findById(req.params.id);

        if (!scan) {
            return res.status(404).json({
                error: "Scan not found"
            });
        }

        res.json(scan);

    } catch (error) {

        res.status(500).json({
            error: "Failed to fetch scan"
        });

    }
};


module.exports = {
    getScanHistory,
    getScanById
};