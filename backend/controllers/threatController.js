const { detectThreat } = require('../services/mlService');
const { getRecommendation } = require('../services/recommendationService');
const { saveScanResult } = require('../services/logService');
const { runSecuritySuiteScan } = require('../services/securitySuiteService');

const FALLBACK_USER_ID = "000000000000000000000000";

const mapRiskLevelEnum = (riskScore) => {
    if (riskScore >= 75) return "HIGH";
    if (riskScore >= 40) return "MEDIUM";
    return "LOW";
};

const analyzeThreat = async (req, res) => {
    try {
        const { input } = req.body;

        if (!input) {
            return res.status(400).json({ error: "Input is required for analysis." });
        }

        const analysisOutput = await detectThreat(input, {
            pageUrl: req.body.pageUrl
        });
        
        // Add recommendation based on ML output
        const recommendation = getRecommendation(analysisOutput.threatType, analysisOutput.riskScore);

        // Call Dev B's logService to persist the scan result
        const savedLog = await saveScanResult(req.user ? req.user._id : FALLBACK_USER_ID, {
            inputType: req.body.inputType || "text",
            content: input,
            prediction: analysisOutput.threatType,
            confidence: analysisOutput.riskScore,
            riskLevel: mapRiskLevelEnum(analysisOutput.riskScore),
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

const analyzeSecuritySuite = async (req, res) => {
    try {
        const {
            messageText,
            url,
            promptInput,
            logText,
            generatedText,
            imageUrl,
            imageBase64,
            audioUrl,
            audioBase64,
            saveToLog
        } = req.body || {};

        const hasInput = Boolean(
            messageText || url || promptInput || logText || generatedText ||
            imageUrl || imageBase64 || audioUrl || audioBase64
        );

        if (!hasInput) {
            return res.status(400).json({
                error: "At least one scan input is required (text/url/media/log)."
            });
        }

        const suiteResult = await runSecuritySuiteScan({
            messageText,
            url,
            promptInput,
            logText,
            generatedText,
            imageUrl,
            imageBase64,
            audioUrl,
            audioBase64
        });

        const recommendation = getRecommendation(
            suiteResult.primaryThreatType,
            suiteResult.overallRiskScore
        );

        let logId = null;

        if (saveToLog) {
            const contentSummary = JSON.stringify({
                messageText: messageText ? messageText.slice(0, 500) : "",
                url: url || "",
                promptInput: promptInput ? promptInput.slice(0, 300) : "",
                logText: logText ? logText.slice(0, 500) : "",
                generatedText: generatedText ? generatedText.slice(0, 500) : "",
                hasImageInput: Boolean(imageUrl || imageBase64),
                hasAudioInput: Boolean(audioUrl || audioBase64)
            });

            const savedLog = await saveScanResult(
                req.user ? req.user._id : FALLBACK_USER_ID,
                {
                    inputType: "multi_modal",
                    content: contentSummary,
                    prediction: suiteResult.primaryThreatType,
                    confidence: suiteResult.overallRiskScore,
                    riskLevel: mapRiskLevelEnum(suiteResult.overallRiskScore),
                    explanation: [suiteResult.summary],
                    recommendations: [recommendation]
                }
            );

            logId = savedLog._id;
        }

        return res.json({
            ...suiteResult,
            recommendation,
            logId
        });
    } catch (error) {
        console.error("Error in security suite analysis:", error);
        return res.status(500).json({
            error: "Internal server error during security suite analysis."
        });
    }
};

const quickAnalyzeThreat = async (req, res) => {
    try {
        const { input, pageUrl, title } = req.body;

        if (!input || typeof input !== "string") {
            return res.status(400).json({ error: "Input text is required for quick analysis." });
        }

        const normalizedInput = input.slice(0, 10000);
        const analysisOutput = await detectThreat(normalizedInput, {
            pageUrl: pageUrl || null
        });
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
    quickAnalyzeThreat,
    analyzeSecuritySuite
};
