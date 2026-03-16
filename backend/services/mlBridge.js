const { MODEL_REGISTRY, classifyText } = require("./hfModelService");

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
    attachments.length ? `Attachments: ${attachments.join(", ")}` : "",
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

function mapRiskLevel(probability) {
  if (probability >= 0.75) {
    return "HIGH";
  }

  if (probability >= 0.45) {
    return "MEDIUM";
  }

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

async function analyzeEmail(emailData = {}) {
  const emailText = buildEmailModelInput(emailData);

  if (!emailText) {
    return {
      scam_probability: 0,
      risk_score: 0,
      risk_level: "LOW",
      label: "safe",
      explanation: ["There was not enough email content to run the Hugging Face email phishing detector."],
      explainability: {
        label: "safe",
        confidencePercent: 0,
        summary: "There was not enough email content to run the Hugging Face email phishing detector.",
        indicators: [],
      },
      hfPhishingAnalysis: null,
      model_source: MODEL_REGISTRY.emailPhishing,
      score_basis:
        "Risk score is the phishing probability from the Hugging Face email phishing model, normalized to a 0-100 scale.",
    };
  }

  try {
    const prediction = await classifyText(MODEL_REGISTRY.emailPhishing, emailText);
    const phishingProbability = resolvePhishingProbability(prediction);
    const indicators = buildEmailPhishingIndicators(emailText, emailData);
    const riskScore = Math.round(phishingProbability * 100);
    const riskLevel = mapRiskLevel(phishingProbability);
    const isPhishing = riskLevel !== "LOW" || isPhishingLabel(prediction.label);
    const explanationText = buildEmailPhishingExplanation(isPhishing, indicators, phishingProbability);

    return {
      scam_probability: phishingProbability,
      risk_score: riskScore,
      risk_level: riskLevel,
      label: isPhishing ? "phishing" : "safe",
      explanation: indicators.length > 0 ? indicators : [explanationText],
      explainability: {
        label: isPhishing ? "phishing" : "safe",
        confidencePercent: Number((phishingProbability * 100).toFixed(1)),
        summary: explanationText,
        indicators,
      },
      hfPhishingAnalysis: {
        model: prediction.model,
        label: prediction.label,
        confidence: Number((prediction.score * 100).toFixed(1)),
        topCandidates: Array.isArray(prediction.candidates)
          ? prediction.candidates.slice(0, 3).map((candidate) => ({
              label: String(candidate?.label || "unknown"),
              confidencePercent: Number((clamp(Number(candidate?.score || 0), 0, 1) * 100).toFixed(1)),
            }))
          : [],
      },
      model_source: MODEL_REGISTRY.emailPhishing,
      score_basis:
        "Risk score is the phishing probability from HF_MODEL_EMAIL_PHISHING using subject, sender, sender email, snippet, body, links, and attachment names, normalized to a 0-100 scale.",
    };
  } catch (error) {
    const indicators = buildEmailPhishingIndicators(emailText, emailData);
    const probability = computeHeuristicPhishingProbability(emailText, emailData);
    const heuristicScore = Math.round(probability * 100);
    const riskLevel = mapRiskLevel(probability);
    const isPhishing = heuristicScore >= 55;
    const explanationText = isPhishing
      ? `This email looks suspicious because it contains ${indicators.slice(0, 3).join(", ")}.`
      : "This email does not look strongly phishy based on its wording and structure.";

    return {
      scam_probability: probability,
      risk_score: heuristicScore,
      risk_level: riskLevel,
      label: isPhishing ? "phishing" : "safe",
      explanation: indicators.length > 0 ? indicators : [explanationText],
      explainability: {
        label: isPhishing ? "phishing" : "safe",
        confidencePercent: Number(heuristicScore.toFixed(1)),
        summary: `${explanationText} The estimate was based on visible phishing signs because the Hugging Face detector was unavailable.`,
        indicators,
      },
      hfPhishingAnalysis: {
        model: MODEL_REGISTRY.emailPhishing,
        label: "heuristic_fallback",
        confidence: Number(heuristicScore.toFixed(1)),
        topCandidates: [],
        error: error.message,
      },
      model_source: MODEL_REGISTRY.emailPhishing,
      score_basis:
        "Risk score was estimated from phishing heuristics because the Hugging Face email phishing model was unavailable.",
    };
  }
}

module.exports = {
  analyzeEmail,
};
