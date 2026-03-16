const ScanLog = require("../models/ScanLog");

const saveScanResult = async (userId, scanData) => {
    try {

        const scan = new ScanLog({
            user: userId,
            inputType: scanData.inputType,
            content: scanData.content,
            prediction: scanData.prediction,
            confidence: scanData.confidence,
            riskLevel: scanData.riskLevel,
            explanation: scanData.explanation,
            recommendations: scanData.recommendations
        });

        const savedScan = await scan.save();

        return savedScan;

    } catch (error) {

        console.error("Error saving scan result:", error);

        throw error;
    }
};

module.exports = {
    saveScanResult
};
