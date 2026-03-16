const { execFile } = require("child_process");
const path = require("path");
const util = require("util");
const { MODEL_REGISTRY, classifyText } = require("./hfModelService");

const execFileAsync = util.promisify(execFile);
const WINDOWS_PYTHON_ERROR_SNIPPETS = [
  "Python was not found",
  "not recognized as an internal or external command",
  "is not recognized"
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function safeLower(value) {
  return String(value || "").trim().toLowerCase();
}

function buildEmailModelInput(emailData = {}) {
  const links = Array.isArray(emailData.links) ? emailData.links.filter(Boolean).slice(0, 10) : [];
  const linkDomains = Array.isArray(emailData.linkDomains) ? emailData.linkDomains.filter(Boolean).slice(0, 10) : [];
  const attachments = Array.isArray(emailData.attachments)
    ? emailData.attachments
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          const filename = item?.filename || "";
          const mimeType = item?.mimeType || "";
          const size = item?.size ? `${item.size} bytes` : "";
          return [filename, mimeType, size].filter(Boolean).join(" ");
        })
        .filter(Boolean)
        .slice(0, 10)
    : [];

  return [
    `Subject: ${emailData.subject || ""}`,
    `Sender: ${emailData.sender || ""}`,
    `Sender Name: ${emailData.senderName || ""}`,
    `Sender Email: ${emailData.senderEmail || ""}`,
    `Sender Domain: ${emailData.senderDomain || ""}`,
    `Sent At: ${emailData.sentAt || ""}`,
    `Snippet: ${emailData.snippet || ""}`,
    `Body: ${emailData.body || ""}`,
    links.length ? `Links: ${links.join(", ")}` : "",
    linkDomains.length ? `Link Domains: ${linkDomains.join(", ")}` : "",
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

function mapRiskLevelFromProbability(probability) {
  if (probability >= 0.75) {
    return "HIGH";
  }

  if (probability >= 0.45) {
    return "MEDIUM";
  }

  return "LOW";
}

function mapRiskLevelFromScore(score) {
  if (score >= 75) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
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

function computeHeuristicPhishingProbability(emailText = "", emailData = {}) {
  const normalized = safeLower(emailText);
  const senderDomain = safeLower(emailData.senderDomain || "");
  const linkDomains = Array.isArray(emailData.linkDomains) ? emailData.linkDomains.map(safeLower) : [];
  const attachments = Array.isArray(emailData.attachments) ? emailData.attachments : [];

  let score = 0.08;

  if (/(urgent|immediately|asap|within 24 hours|act now)/.test(normalized)) {
    score += 0.13;
  }

  if (/(verify your account|reset your password|confirm your identity|login to continue)/.test(normalized)) {
    score += 0.16;
  }

  if (/(otp|one-time password|passcode|security code)/.test(normalized)) {
    score += 0.1;
  }

  if (/(suspend|suspension|deactivated|locked|disabled)/.test(normalized)) {
    score += 0.11;
  }

  if (/(bank|payroll|invoice|wallet|gift card|refund)/.test(normalized)) {
    score += 0.09;
  }

  if (Array.isArray(emailData.links) && emailData.links.length > 0) {
    score += Math.min(0.04 * emailData.links.length, 0.14);
  }

  if (linkDomains.some((domain) => domain && senderDomain && !domain.includes(senderDomain) && !senderDomain.includes(domain))) {
    score += 0.08;
  }

  if (attachments.length > 0) {
    score += Math.min(attachments.length * 0.015, 0.05);
  }

  if (normalized.length > 1200) {
    score += 0.03;
  }

  return clamp(Number(score.toFixed(4)), 0, 0.99);
}

function buildFallbackEmailResult(hfPhishingAnalysis = {}, localModelError) {
  const confidence = clamp(
    Number(
      hfPhishingAnalysis.confidence ??
      (Number.isFinite(Number(hfPhishingAnalysis.riskScore))
        ? Number(hfPhishingAnalysis.riskScore) / 100
        : 0)
    ),
    0,
    1
  );
  const riskScore = clamp(
    Number(
      hfPhishingAnalysis.riskScore ??
      Math.round(confidence * 100)
    ),
    0,
    100
  );
  const indicators = Array.isArray(hfPhishingAnalysis.indicators)
    ? hfPhishingAnalysis.indicators.filter(Boolean).slice(0, 5)
    : [];
  const explanation = [
    hfPhishingAnalysis.explanation ||
      (hfPhishingAnalysis.isPhishing
        ? "Email fallback analysis flagged suspicious phishing indicators."
        : "Email fallback analysis did not find strong phishing indicators."),
    localModelError ? `Local email model unavailable: ${localModelError.message}` : ""
  ].filter(Boolean);

  return {
    scam_probability: Number(confidence.toFixed(6)),
    risk_score: riskScore,
    risk_level: mapRiskLevelFromScore(riskScore),
    label: hfPhishingAnalysis.isPhishing ? "phishing" : "safe",
    explanation,
    explainability: hfPhishingAnalysis.explainability || {
      label: hfPhishingAnalysis.label || (hfPhishingAnalysis.isPhishing ? "Likely Phishing Email" : "Likely Safe Email"),
      confidencePercent: Number((confidence * 100).toFixed(1)),
      summary: explanation.join(" "),
      indicators
    },
    hfPhishingAnalysis,
    model_source:
      hfPhishingAnalysis.source === "heuristic_fallback"
        ? "HF heuristic fallback email analysis"
        : `HF email phishing detector (${MODEL_REGISTRY.emailPhishing})`,
    score_basis:
      hfPhishingAnalysis.source === "heuristic_fallback"
        ? "Risk score is derived from heuristic phishing indicators because the local and hosted email models were unavailable."
        : "Risk score is derived from the hosted email phishing detector on a 0-100 scale."
  };
}

function getPythonCandidates() {
  const configured = String(process.env.PYTHON_BIN || "").trim();
  const candidates = [];

  if (configured) {
    candidates.push(configured);
  }

  if (process.platform === "win32") {
    candidates.push("py", "python", "python3");
  } else {
    candidates.push("python3", "python");
  }

  return [...new Set(candidates.filter(Boolean))];
}

function isMissingPythonError(error) {
  const message = String(error?.stderr || error?.message || "").toLowerCase();
  return WINDOWS_PYTHON_ERROR_SNIPPETS.some((snippet) => message.includes(snippet.toLowerCase())) || error?.code === "ENOENT";
}

async function runLocalEmailModel(scriptPath, emailData) {
  const candidates = getPythonCandidates();
  let lastError = null;

  for (const pythonBin of candidates) {
    try {
      return await execFileAsync(pythonBin, [scriptPath, JSON.stringify(emailData)], {
        maxBuffer: 1024 * 1024
      });
    } catch (error) {
      lastError = error;
      if (!isMissingPythonError(error)) {
        throw error;
      }
    }
  }

  const configuredHint = process.env.PYTHON_BIN
    ? ` Current PYTHON_BIN is "${process.env.PYTHON_BIN}".`
    : "";
  const fallbackHint =
    process.platform === "win32"
      ? " Install Python and set `PYTHON_BIN=py` or `PYTHON_BIN=python` in backend/.env."
      : " Install Python and set `PYTHON_BIN=python3` in backend/.env.";

  throw new Error(
    `Unable to find a working Python executable for email scanning.${configuredHint}${fallbackHint}${
      lastError?.message ? ` Last error: ${lastError.message}` : ""
    }`
  );
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
    const probability = computeHeuristicPhishingProbability(emailText, emailData);
    const heuristicScore = Math.round(probability * 100);
    const riskLevel = mapRiskLevelFromProbability(probability);
    const isPhishing = heuristicScore >= 55;
    const explanationText = isPhishing
      ? `This email looks suspicious because it contains ${indicators.slice(0, 3).join(", ")}.`
      : "This email does not look strongly phishy based on its wording and structure.";

    return {
      isPhishing,
      riskScore: heuristicScore,
      label: isPhishing ? "Possibly Phishing Email" : "Likely Safe Email",
      confidence: probability,
      explanation: explanationText,
      indicators,
      explainability: {
        label: isPhishing ? "Possibly Phishing Email" : "Likely Safe Email",
        confidencePercent: Number(heuristicScore.toFixed(1)),
        summary: `${explanationText} The estimate was based on visible phishing signs because the dedicated detector was unavailable.`,
        indicators
      },
      source: "heuristic_fallback",
      error: error.message
    };
  }
}

async function analyzeEmail(emailData = {}) {
  const scriptPath = path.join(__dirname, "ml_bridge.py");
  const [localModelResult, hfPhishingAnalysis] = await Promise.allSettled([
    runLocalEmailModel(scriptPath, emailData),
    analyzeEmailHfPhishing(emailData)
  ]);

  const resolvedHfAnalysis = hfPhishingAnalysis.status === "fulfilled"
    ? hfPhishingAnalysis.value
    : {
        isPhishing: false,
        riskScore: 0,
        label: "Likely Safe Email",
        confidence: 0,
        explanation: "Hosted email phishing analysis is unavailable.",
        indicators: [],
        explainability: {
          label: "Likely Safe Email",
          confidencePercent: 0,
          summary: "Hosted email phishing analysis is unavailable.",
          indicators: []
        },
        source: "analysis_unavailable",
        error: hfPhishingAnalysis.reason?.message || "Unknown hosted email analysis error"
      };

  if (localModelResult.status !== "fulfilled") {
    return buildFallbackEmailResult(resolvedHfAnalysis, localModelResult.reason);
  }

  const result = JSON.parse(localModelResult.value.stdout.trim());

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

  result.hfPhishingAnalysis = resolvedHfAnalysis;

  return result;
}

module.exports = {
  analyzeEmail,
  analyzeEmailHfPhishing
};
