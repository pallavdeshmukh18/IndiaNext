const { execFile } = require("child_process");
const path = require("path");
const util = require("util");
const { MODEL_REGISTRY, classifyText } = require("./hfModelService");

const execFileAsync = util.promisify(execFile);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function safeLower(value) {
  return String(value || "").trim().toLowerCase();
}

function buildEmailModelInput(emailData = {}) {
  const links = Array.isArray(emailData.links) ? emailData.links.filter(Boolean).slice(0, 10) : [];
  const attachments = Array.isArray(emailData.attachments)
    ? emailData.attachments.map((item) => item?.filename).filter(Boolean).slice(0, 10)
    : [];

  return [
    `Subject: ${emailData.subject || ""}`,
    `From: ${emailData.sender || ""}`,
    `Body: ${emailData.body || emailData.snippet || ""}`,
    links.length ? `Links: ${links.join(", ")}` : "",
    attachments.length ? `Attachments: ${attachments.join(", ")}` : ""
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

function isPhishingLabel(label) {
  const normalized = safeLower(label);
  return (
    normalized.includes("phish") ||
    normalized.includes("spam") ||
    normalized.includes("scam") ||
    normalized.includes("fraud") ||
    normalized.includes("malicious") ||
    normalized === "label_1"
  );
}

function isSafeLabel(label) {
  const normalized = safeLower(label);
  return (
    normalized.includes("safe") ||
    normalized.includes("benign") ||
    normalized.includes("legitimate") ||
    normalized.includes("ham") ||
    normalized === "label_0"
  );
}

function resolvePhishingProbability(prediction = {}) {
  const candidates = Array.isArray(prediction.candidates) ? prediction.candidates : [];
  const phishingCandidate = candidates.find((candidate) => isPhishingLabel(candidate?.label));

  if (phishingCandidate) {
    return clamp(Number(phishingCandidate.score || 0), 0, 1);
  }

  if (isPhishingLabel(prediction.label)) {
    return clamp(Number(prediction.score || 0), 0, 1);
  }

  if (isSafeLabel(prediction.label)) {
    return clamp(1 - Number(prediction.score || 0), 0, 1);
  }

  return clamp(Number(prediction.score || 0), 0, 1);
}

function buildEmailPhishingIndicators(emailText = "", emailData = {}) {
  const normalized = safeLower(emailText);
  const indicators = [];

  if (/(urgent|immediately|asap|within 24 hours|act now)/.test(normalized)) {
    indicators.push("urgent or high-pressure wording");
  }

  if (/(verify your account|reset your password|confirm your identity|login to continue)/.test(normalized)) {
    indicators.push("requests to verify an account or reset credentials");
  }

  if (/(otp|one-time password|passcode|security code)/.test(normalized)) {
    indicators.push("requests for sensitive codes or OTPs");
  }

  if (/(suspend|suspension|deactivated|locked|disabled)/.test(normalized)) {
    indicators.push("threats about suspension or account lockout");
  }

  if (Array.isArray(emailData.links) && emailData.links.length > 0) {
    indicators.push("embedded links that ask the reader to take action");
  }

  if (/(bank|payroll|invoice|wallet|gift card|refund)/.test(normalized)) {
    indicators.push("financial or payment-themed wording");
  }

  return indicators.slice(0, 5);
}

function buildEmailPhishingExplanation(isPhishing, indicators = [], phishingProbability = 0) {
  const probabilityPercent = Number((clamp(phishingProbability, 0, 1) * 100).toFixed(1));

  if (isPhishing) {
    if (indicators.length > 0) {
      return `This email looks suspicious because it contains ${indicators.slice(0, 3).join(", ")}. Estimated phishing likelihood is ${probabilityPercent}%.`;
    }

    return `This email looks suspicious because its wording and structure match common phishing patterns. Estimated phishing likelihood is ${probabilityPercent}%.`;
  }

  if (indicators.length > 0) {
    return "This email does not look strongly phishy overall, although a few warning signs were present.";
  }

  return "This email does not look strongly phishy based on its wording and structure.";
}

async function analyzeEmailHfPhishing(emailData = {}) {
  const emailText = buildEmailModelInput(emailData);

  if (!emailText) {
    return {
      isPhishing: false,
      riskScore: 0,
      label: "Likely Safe Email",
      confidence: 0,
      explanation: "There was not enough email content to run the phishing email detector.",
      indicators: [],
      explainability: {
        label: "Likely Safe Email",
        confidencePercent: 0,
        summary: "There was not enough email content to run the phishing email detector.",
        indicators: []
      }
    };
  }

  try {
    const prediction = await classifyText(MODEL_REGISTRY.emailPhishing, emailText);
    const phishingProbability = resolvePhishingProbability(prediction);
    const indicators = buildEmailPhishingIndicators(emailText, emailData);
    const isPhishing = phishingProbability >= 0.55 || (isPhishingLabel(prediction.label) && phishingProbability >= 0.4);
    const explanation = buildEmailPhishingExplanation(isPhishing, indicators, phishingProbability);

    return {
      isPhishing,
      riskScore: Math.round(phishingProbability * 100),
      label: isPhishing ? "Likely Phishing Email" : "Likely Safe Email",
      confidence: phishingProbability,
      explanation,
      indicators,
      explainability: {
        label: isPhishing ? "Likely Phishing Email" : "Likely Safe Email",
        confidencePercent: Number((phishingProbability * 100).toFixed(1)),
        summary: explanation,
        indicators,
        topCandidates: Array.isArray(prediction.candidates)
          ? prediction.candidates.slice(0, 3).map((candidate) => ({
              label: String(candidate?.label || "unknown"),
              confidencePercent: Number((clamp(Number(candidate?.score || 0), 0, 1) * 100).toFixed(1))
            }))
          : []
      }
    };
  } catch (error) {
    const indicators = buildEmailPhishingIndicators(emailText, emailData);
    const heuristicScore = clamp(indicators.length * 18, 0, 100);
    const isPhishing = heuristicScore >= 55;
    const explanation = isPhishing
      ? `This email looks suspicious because it contains ${indicators.slice(0, 3).join(", ")}.`
      : "This email does not look strongly phishy based on its wording and structure.";

    return {
      isPhishing,
      riskScore: heuristicScore,
      label: isPhishing ? "Possibly Phishing Email" : "Likely Safe Email",
      confidence: clamp(heuristicScore / 100, 0, 1),
      explanation,
      indicators,
      explainability: {
        label: isPhishing ? "Possibly Phishing Email" : "Likely Safe Email",
        confidencePercent: Number(clamp(heuristicScore, 0, 100).toFixed(1)),
        summary: `${explanation} The estimate was based on visible phishing signs because the dedicated detector was unavailable.`,
        indicators
      },
      source: "heuristic_fallback",
      error: error.message
    };
  }
}

async function analyzeEmail(emailData) {
  const scriptPath = path.join(__dirname, "ml_bridge.py");
  const pythonBin = process.env.PYTHON_BIN || "python3";
  const [{ stdout }, hfPhishingAnalysis] = await Promise.all([
    execFileAsync(pythonBin, [scriptPath, JSON.stringify(emailData)], {
      maxBuffer: 1024 * 1024,
    }),
    analyzeEmailHfPhishing(emailData)
  ]);

  const result = JSON.parse(stdout.trim());

  if (!Array.isArray(result.explanation)) {
    result.explanation = [];
  }

  result.scam_probability = Number(result.scam_probability || 0);
  result.risk_score = Number(result.risk_score ?? result.scam_probability * 100);
  result.risk_level = result.risk_level || "LOW";
  result.model_source = result.model_source || "ML/phishing_mail/phishing_model.pkl";
  result.score_basis =
    result.score_basis ||
    "Risk score is derived from the local phishing model probability on a 0-100 scale.";

  if (result.explanation.length === 0) {
    result.explanation = [`Model confidence: ${(Number(result.scam_probability) * 100).toFixed(1)}%`];
  }

  if (!result.explainability) {
    result.explainability = {
      label: result.label || "unknown",
      confidencePercent: Number((Number(result.scam_probability || 0) * 100).toFixed(1)),
      summary: Array.isArray(result.explanation) ? result.explanation.join(" ") : String(result.explanation || ""),
      indicators: Array.isArray(result.explanation) ? result.explanation.slice(0, 5) : []
    };
  }

  result.hfPhishingAnalysis = hfPhishingAnalysis;

  return result;
}

module.exports = {
  analyzeEmail,
  analyzeEmailHfPhishing,
};
