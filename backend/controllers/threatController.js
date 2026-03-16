const { detectThreat } = require('../services/mlService');
const { getRecommendation } = require('../services/recommendationService');
const { saveScanResult } = require('../services/logService');

const analyzeThreat = async (req, res) => {
    try {
        const { input } = req.body;

        if (!input) {
            return res.status(400).json({ error: "Input is required for analysis." });
        }

        const analysisOutput = await detectThreat(input);
        
        // Add recommendation based on ML output
        const recommendation = getRecommendation(analysisOutput.threatType, analysisOutput.riskScore);

        // Derive riskLevel mapped for ScanLog schema
        let riskLevelEnum = "LOW";
        if (analysisOutput.riskScore > 75) riskLevelEnum = "HIGH";
        else if (analysisOutput.riskScore > 40) riskLevelEnum = "MEDIUM";

        // Call Dev B's logService to persist the scan result
        const savedLog = await saveScanResult(req.user._id, {
            inputType: req.body.inputType || "text",
            content: input,
            prediction: analysisOutput.threatType,
            confidence: analysisOutput.riskScore,
            riskLevel: riskLevelEnum,
            explanation: [analysisOutput.explanation],
            recommendations: [recommendation]
        });

        const result = {
            ...analysisOutput,
            recommendation,
            logId: savedLog._id // Including the DB id in the response as confirmation
        };

        res.json(result);

    } catch (error) {
        console.error("Error analyzing threat:", error);
        res.status(500).json({ error: "Internal server error during threat analysis." });
    }
};

module.exports = {
    analyzeThreat
};
