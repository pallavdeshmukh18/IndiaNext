const ScanLog = require("../models/ScanLog");

const getHighRiskAlerts = async (userId) => {

    const alerts = await ScanLog
        .find({
            user: userId,
            riskLevel: "HIGH"
        })
        .sort({ createdAt: -1 })
        .limit(20);

    return alerts;

};

module.exports = {
    getHighRiskAlerts
};
