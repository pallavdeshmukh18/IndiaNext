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
    const prediction = await classifyText(MODEL_REGISTRY.emailAiGenerated, emailText);
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
  const pythonBin = process.env.PYTHON_BIN || "python3";
  const [{ stdout }, aiGeneratedAnalysis] = await Promise.all([
    execFileAsync(pythonBin, [scriptPath, JSON.stringify(emailData)], {
      maxBuffer: 1024 * 1024,
    }),
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

  result.aiGeneratedAnalysis = aiGeneratedAnalysis;

  return result;
}

module.exports = {
  analyzeEmail,
  analyzeEmailAiGenerated,
};
