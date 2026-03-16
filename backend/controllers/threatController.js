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
        const savedLog = await saveScanResult(req.user ? req.user._id : "000000000000000000000000", {
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

const quickAnalyzeThreat = async (req, res) => {
    try {
        const { input, pageUrl, title } = req.body;

        if (!input || typeof input !== "string") {
            return res.status(400).json({ error: "Input text is required for quick analysis." });
        }

        const normalizedInput = input.slice(0, 10000);
        const analysisOutput = await detectThreat(normalizedInput);
        const recommendation = getRecommendation(analysisOutput.threatType, analysisOutput.riskScore);

        res.json({
            ...analysisOutput,
            recommendation,
            analyzedAt: new Date().toISOString(),
            source: {
                pageUrl: pageUrl || null,
                title: title || null
            }
        });
    } catch (error) {
        console.error("Error in quick threat analysis:", error);
        res.status(500).json({ error: "Internal server error during quick analysis." });
    }
};

module.exports = {
    analyzeThreat,
    quickAnalyzeThreat
};
