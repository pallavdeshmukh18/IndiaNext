const { detectThreat } = require('../services/mlService');
const { getRecommendation } = require('../services/recommendationService');
const { saveScanResult } = require('../services/logService');
const { runSecuritySuiteScan } = require('../services/securitySuiteService');
const { analyzeLiveScreen } = require('../services/liveScreenAnalysisService');

const FALLBACK_USER_ID = "000000000000000000000000";

const mapRiskLevelEnum = (riskScore) => {
    if (riskScore >= 75) return "HIGH";
    if (riskScore >= 40) return "MEDIUM";
    return "LOW";
};

const parseBoolean = (value) => {
    if (typeof value === 'boolean') return value;

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }

    return Boolean(value);
};

const toDataUriFromUploadedFile = (file) => {
    if (!file?.buffer || !file.buffer.length) {
        return null;
    }

    const mimeType = file.mimetype || 'application/octet-stream';
    return `data:${mimeType};base64,${file.buffer.toString('base64')}`;
};

const analyzeThreat = async (req, res) => {
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
            inputType = "messageText"
        } = req.body;

        // Get the actual input based on inputType
        const input = req.body[inputType] || messageText || url || promptInput || logText || generatedText;

        if (!input) {
            return res.status(400).json({ error: "Input is required for analysis." });
        }

        const analysisOutput = await detectThreat(input, {
            pageUrl: req.body.pageUrl,
            inputType
        });
        
        // Add recommendation based on ML output
        const recommendation = getRecommendation(analysisOutput.threatType, analysisOutput.riskScore);

        // Call Dev B's logService to persist the scan result
        const savedLog = await saveScanResult(req.user ? req.user._id : FALLBACK_USER_ID, {
            inputType: inputType || "text",
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

        const uploadedImageFile = req.file || req.files?.image?.[0] || req.files?.imageFile?.[0] || null;
        const uploadedImageBase64 = toDataUriFromUploadedFile(uploadedImageFile);
        const effectiveImageBase64 = imageBase64 || uploadedImageBase64;
        const shouldSaveToLog = parseBoolean(saveToLog);

        const hasInput = Boolean(
            messageText || url || promptInput || logText || generatedText ||
            imageUrl || effectiveImageBase64 || audioUrl || audioBase64
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
            imageBase64: effectiveImageBase64,
            audioUrl,
            audioBase64
        });

        const recommendation = getRecommendation(
            suiteResult.primaryThreatType,
            suiteResult.overallRiskScore
        );

        let logId = null;

        if (shouldSaveToLog) {
            const contentSummary = JSON.stringify({
                messageText: messageText ? messageText.slice(0, 500) : "",
                url: url || "",
                promptInput: promptInput ? promptInput.slice(0, 300) : "",
                logText: logText ? logText.slice(0, 500) : "",
                generatedText: generatedText ? generatedText.slice(0, 500) : "",
                hasImageInput: Boolean(imageUrl || effectiveImageBase64),
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
        const {
            messageText,
            url,
            promptInput,
            logText,
            generatedText,
            imageUrl,
            imageBase64,
            inputType = "messageText",
            pageUrl,
            title
        } = req.body;

        // Get the actual input based on inputType
        const input = req.body[inputType] || messageText || url || promptInput || logText || generatedText;

        if (!input || typeof input !== "string") {
            return res.status(400).json({ error: "Input text is required for quick analysis." });
        }

        const normalizedInput = input.slice(0, 10000);
        const analysisOutput = await detectThreat(normalizedInput, {
            pageUrl: pageUrl || null,
            inputType
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

const analyzeLiveScreenThreat = async (req, res) => {
    try {
        const { pageUrl, title, pageSignals, screenshotBase64, pageText } = req.body || {};

        if (!pageUrl && !pageSignals && !pageText && !screenshotBase64) {
            return res.status(400).json({
                error: "Page signals, page text, or screenshot input is required for live-screen analysis."
            });
        }

        const analysisOutput = await analyzeLiveScreen({
            pageUrl,
            title,
            pageSignals,
            screenshotBase64,
            pageText
        });
        const recommendation = getRecommendation(analysisOutput.threatType, analysisOutput.riskScore);

        return res.json({
            ...analysisOutput,
            recommendation
        });
    } catch (error) {
        console.error("Error in live screen threat analysis:", error);
        return res.status(500).json({
            error: "Internal server error during live screen analysis."
        });
    }
};

module.exports = {
    analyzeThreat,
    quickAnalyzeThreat,
    analyzeSecuritySuite,
    analyzeLiveScreenThreat
};
