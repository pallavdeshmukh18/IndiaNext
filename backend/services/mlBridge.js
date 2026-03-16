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

function isAiGeneratedLabel(label) {
  const normalized = safeLower(label);
  return (
    normalized.includes("fake") ||
    normalized.includes("ai") ||
    normalized.includes("generated") ||
    normalized.includes("machine") ||
    normalized === "label_1"
  );
}

function isHumanLabel(label) {
  const normalized = safeLower(label);
  return (
    normalized.includes("real") ||
    normalized.includes("human") ||
    normalized.includes("organic") ||
    normalized === "label_0"
  );
}

function resolveAiProbability(prediction = {}) {
  const candidates = Array.isArray(prediction.candidates) ? prediction.candidates : [];
  const aiCandidate = candidates.find((candidate) => isAiGeneratedLabel(candidate?.label));

  if (aiCandidate) {
    return clamp(Number(aiCandidate.score || 0), 0, 1);
  }

  if (isAiGeneratedLabel(prediction.label)) {
    return clamp(Number(prediction.score || 0), 0, 1);
  }

  if (isHumanLabel(prediction.label)) {
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

function buildEmailAiIndicators(emailText = "", emailData = {}) {
  const normalized = safeLower(emailText);
  const indicators = [];
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const uniqueTokens = new Set(tokens);
  const diversity = tokens.length ? uniqueTokens.size / tokens.length : 1;
  const sentenceCount = Math.max(normalized.split(/[.!?]+/).filter((part) => part.trim()).length, 1);
  const avgSentenceLength = tokens.length / sentenceCount;

  if (/dear (user|customer|valued customer|sir|madam)/.test(normalized)) {
    indicators.push("generic greeting instead of a personal name");
  }

  if (/(kind regards|best regards|sincerely|warm regards|regards,)/.test(normalized)) {
    indicators.push("formal template-style signoff");
  }

  if (avgSentenceLength >= 18) {
    indicators.push("very polished sentence structure");
  }

  if (tokens.length >= 80 && diversity <= 0.68) {
    indicators.push("repetitive wording across the email");
  }

  if (/(furthermore|moreover|in addition|therefore|accordingly)/.test(normalized)) {
    indicators.push("overly polished connector words");
  }

  if ((emailData.links || []).length === 0 && tokens.length >= 120) {
    indicators.push("long polished copy without concrete personal details");
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

function buildEmailAiExplanation(isAIGenerated, indicators = [], aiProbability = 0) {
  const probabilityPercent = Number((clamp(aiProbability, 0, 1) * 100).toFixed(1));

  if (isAIGenerated) {
    if (indicators.length > 0) {
      return `This email may be AI-generated because it shows ${indicators.slice(0, 3).join(", ")}. Estimated AI-written likelihood is ${probabilityPercent}%.`;
    }

    return `This email may be AI-generated because its wording and sentence flow look highly machine-written. Estimated AI-written likelihood is ${probabilityPercent}%.`;
  }

  if (indicators.length > 0) {
    return "This email does not strongly look AI-generated. A few polished patterns were present, but they were not strong enough to treat the email as machine-written.";
  }

  return "This email does not strongly look AI-generated. Its wording appears closer to normal human-written email patterns.";
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
        maxBuffer: 1024 * 1024,
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
      ? ' Install Python and set `PYTHON_BIN=py` or `PYTHON_BIN=python` in backend/.env.'
      : ' Install Python and set `PYTHON_BIN=python3` in backend/.env.';

  throw new Error(
    `Unable to find a working Python executable for email scanning.${configuredHint}${fallbackHint}${lastError?.message ? ` Last error: ${lastError.message}` : ""}`
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

async function analyzeEmailAiGenerated(emailData = {}) {
  const emailText = buildEmailModelInput(emailData);

  if (!emailText) {
    return {
      isAIGenerated: false,
      riskScore: 0,
      label: "Likely Human-Written Email",
      confidence: 0,
      explanation: "There was not enough email content to check whether the writing looks AI-generated.",
      indicators: [],
      explainability: {
        label: "Likely Human-Written Email",
        confidencePercent: 0,
        summary: "There was not enough email content to check whether the writing looks AI-generated.",
        indicators: []
      }
    };
  }

  try {
    const prediction = await classifyText(MODEL_REGISTRY.aiGeneratedText, emailText);
    const aiProbability = resolveAiProbability(prediction);
    const indicators = buildEmailAiIndicators(emailText, emailData);
    const isAIGenerated = aiProbability >= 0.55 || (isAiGeneratedLabel(prediction.label) && aiProbability >= 0.4);
    const explanation = buildEmailAiExplanation(isAIGenerated, indicators, aiProbability);

    return {
      isAIGenerated,
      riskScore: Math.round(aiProbability * 100),
      label: isAIGenerated ? "Likely AI-Generated Email" : "Likely Human-Written Email",
      confidence: aiProbability,
      explanation,
      indicators,
      explainability: {
        label: isAIGenerated ? "Likely AI-Generated Email" : "Likely Human-Written Email",
        confidencePercent: Number((aiProbability * 100).toFixed(1)),
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
    const indicators = buildEmailAiIndicators(emailText, emailData);
    const heuristicScore = clamp(indicators.length * 18, 0, 100);
    const isAIGenerated = heuristicScore >= 55;
    const explanation = isAIGenerated
      ? `This email may be AI-generated because it shows ${indicators.slice(0, 3).join(", ")}.`
      : "This email does not strongly look AI-generated based on its writing style.";

    return {
      isAIGenerated,
      riskScore: heuristicScore,
      label: isAIGenerated ? "Possibly AI-Generated Email" : "Likely Human-Written Email",
      confidence: clamp(heuristicScore / 100, 0, 1),
      explanation,
      indicators,
      explainability: {
        label: isAIGenerated ? "Possibly AI-Generated Email" : "Likely Human-Written Email",
        confidencePercent: Number(clamp(heuristicScore, 0, 100).toFixed(1)),
        summary: `${explanation} The estimate was based on visible writing-style patterns because the dedicated detector was unavailable.`,
        indicators
      },
      source: "heuristic_fallback",
      error: error.message
    };
  }
}

async function analyzeEmail(emailData) {
  const scriptPath = path.join(__dirname, "ml_bridge.py");
  const [{ stdout }, hfPhishingAnalysis, aiGeneratedAnalysis] = await Promise.all([
    runLocalEmailModel(scriptPath, emailData),
    analyzeEmailHfPhishing(emailData),
    analyzeEmailAiGenerated(emailData)
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
  result.aiGeneratedAnalysis = aiGeneratedAnalysis;

  return result;
}

module.exports = {
  analyzeEmail,
  analyzeEmailHfPhishing,
  analyzeEmailAiGenerated,
};
