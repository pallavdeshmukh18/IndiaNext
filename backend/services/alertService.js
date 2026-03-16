const ScanLog = require("../models/ScanLog");

const getHighRiskAlerts = async () => {

    const alerts = await ScanLog
        .find({ riskLevel: "HIGH" })
        .sort({ createdAt: -1 })
        .limit(20);

    return alerts;

};

module.exports = {
    getHighRiskAlerts
};