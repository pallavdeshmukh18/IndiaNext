const ScanLog = require("../models/ScanLog");

// overall statistics
const getAnalytics = async (userId) => {
    const query = { user: userId };

    const totalScans = await ScanLog.countDocuments(query);

    const highRisk = await ScanLog.countDocuments({ ...query, riskLevel: "HIGH" });
    const mediumRisk = await ScanLog.countDocuments({ ...query, riskLevel: "MEDIUM" });
    const lowRisk = await ScanLog.countDocuments({ ...query, riskLevel: "LOW" });

    return {
        totalScans,
        highRisk,
        mediumRisk,
        lowRisk
    };
};

const getThreatTypes = async (userId) => {

    const threats = await ScanLog.aggregate([
        {
            $match: {
                user: userId
            }
        },
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
const getThreatTrends = async (userId) => {

    const trends = await ScanLog.aggregate([
        {
            $match: {
                user: userId
            }
        },
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
