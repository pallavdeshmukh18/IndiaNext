const ScanLog = require("../models/ScanLog");

// overall statistics
const getAnalytics = async () => {

    const totalScans = await ScanLog.countDocuments();

    const highRisk = await ScanLog.countDocuments({ riskLevel: "HIGH" });
    const mediumRisk = await ScanLog.countDocuments({ riskLevel: "MEDIUM" });
    const lowRisk = await ScanLog.countDocuments({ riskLevel: "LOW" });

    return {
        totalScans,
        highRisk,
        mediumRisk,
        lowRisk
    };
};

const getThreatTypes = async () => {

    const threats = await ScanLog.aggregate([
        {
            $group: {
                _id: "$prediction",
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);

    return threats.map(t => ({
        threatType: t._id,
        count: t.count
    }));

};


// SOC threat trend analytics
const getThreatTrends = async () => {

    const trends = await ScanLog.aggregate([
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$createdAt"
                    }
                },
                scans: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    return trends.map(t => ({
        date: t._id,
        scans: t.scans
    }));

};

module.exports = {
    getAnalytics,
    getThreatTrends,
    getThreatTypes
};
