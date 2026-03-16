const axios = require("axios");

const { analyzeEmail } = require("../services/mlBridge");
const { runSecuritySuiteScan } = require("../services/securitySuiteService");

const ML_BASE_URL = process.env.ML_BASE_URL || "http://localhost:5001";

const toClassification = (riskScore) => {
  if (riskScore >= 75) {
    return "Scam";
  }

  if (riskScore >= 40) {
    return "Suspicious";
  }

  return "Safe";
};

const normalizeResult = (result) => ({
  risk_score: Math.round(Number(result.overallRiskScore || result.riskScore || 0)),
  label: result.label || toClassification(Number(result.overallRiskScore || result.riskScore || 0)),
  explanation: result.explanation || result.summary || "No explanation was returned by the analysis engine.",
});

const buildLocalPayload = (service, payload) => {
  switch (service.key) {
    case "email_phishing":
      return {
        messageText: payload.text || payload.input || payload.content || "",
      };
    case "url_phishing":
      return {
        url: payload.text || payload.input || payload.content || "",
      };
    case "ai_content":
      return {
        generatedText: payload.text || payload.input || payload.content || "",
      };
    case "anomaly":
      return {
        logText: payload.text || payload.input || payload.content || "",
      };
    case "deepfake_voice":
      return {
        audioBase64: payload.audioBase64 || payload.fileBase64 || null,
      };
    case "deepfake_image":
      return {
        imageBase64: payload.imageBase64 || payload.fileBase64 || null,
      };
    case "prompt_injection":
      return {
        promptInput: payload.text || payload.input || payload.content || "",
      };
    default:
      return {
        messageText: payload.text || payload.input || payload.content || "",
      };
  }
};

const analyzeViaExternalMl = async (service, payload) => {
  const response = await axios.post(`${ML_BASE_URL}${service.endpoint}`, payload, {
    timeout: 30000,
  });

  return response.data;
};

const analyzeViaLocalSuite = async (service, payload) => {
  if (service.key === "email_phishing") {
    const text = payload.text || payload.input || payload.content || "";
    const emailResult = await analyzeEmail({
      subject: "",
      sender: payload.phone || "",
      body: text,
      links: [],
      attachments: [],
    });

    return {
      risk_score: Math.round(Number(emailResult.scam_probability || 0) * 100),
      label: emailResult.label === "phishing" ? "Scam" : "Safe",
      explanation: Array.isArray(emailResult.explanation) && emailResult.explanation.length > 0
        ? `Top indicators: ${emailResult.explanation.join(", ")}`
        : "Email model completed without additional explanation.",
      ai_generated_analysis: emailResult.aiGeneratedAnalysis || null,
    };
  }

  const suitePayload = buildLocalPayload(service, payload);
  const result = await runSecuritySuiteScan(suitePayload);
  return normalizeResult(result);
};

const analyzeWithMl = async (service, payload) => {
  try {
    const externalResult = await analyzeViaExternalMl(service, payload);
    return normalizeResult(externalResult);
  } catch (error) {
    console.error(
      "External ML endpoint unavailable, falling back to local security suite:",
      JSON.stringify({
        service: service.key,
        status: error.response?.status || null,
        message: error.message,
      })
    );

    return analyzeViaLocalSuite(service, payload);
  }
};

module.exports = {
  analyzeWithMl,
};
