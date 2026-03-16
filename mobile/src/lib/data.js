export function deriveRiskLevel(score) {
  const value = Number(score) || 0;

  if (value >= 75) {
    return "HIGH";
  }

  if (value >= 40) {
    return "MEDIUM";
  }

  return "LOW";
}

function normalizePercent(value, fallback = 0) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return Math.round(fallback);
  }

  if (numeric <= 1) {
    return Math.round(numeric * 100);
  }

  return Math.round(numeric);
}

export function normalizeScan(scan = {}) {
  const riskScore = Number(scan.riskScore ?? scan.confidence ?? 0);
  const explanation = Array.isArray(scan.explanation)
    ? scan.explanation.filter(Boolean)
    : scan.explanation
      ? [scan.explanation]
      : [];
  const recommendations = Array.isArray(scan.recommendations)
    ? scan.recommendations.filter(Boolean)
    : scan.recommendation
      ? [scan.recommendation]
      : [];

  return {
    id: scan.id || scan._id || `scan-${scan.createdAt || scan.analyzedAt || Date.now()}`,
    inputType: scan.inputType || "text",
    content: scan.content || scan.input || "",
    prediction: scan.prediction || scan.threatType || "Unknown threat",
    confidence: normalizePercent(scan.confidence, riskScore),
    riskScore,
    riskLevel: scan.riskLevel || deriveRiskLevel(riskScore),
    explanation: explanation.length
      ? explanation
      : ["The classifier flagged this submission based on its detected behavior pattern."],
    recommendations: recommendations.length
      ? recommendations
      : ["Escalate the item for analyst review."],
    createdAt: scan.createdAt || scan.analyzedAt || new Date().toISOString(),
    source: scan.source || null,
  };
}

function splitSender(sender = "") {
  const match = String(sender).match(/^(.*?)(?:\s*<(.+)>)?$/);

  return {
    senderName: match?.[1]?.replace(/"/g, "").trim() || sender || "Unknown sender",
    senderEmail: match?.[2]?.trim() || sender || "Unknown sender",
  };
}

function formatEmailBody(body = "") {
  return String(body || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function normalizeEmail(email = {}) {
  const { senderName, senderEmail } = splitSender(email.sender);
  const explanationList = Array.isArray(email.explanation)
    ? email.explanation.filter(Boolean)
    : email.explanation
      ? [email.explanation]
      : [];
  const links = Array.isArray(email.links) ? email.links.length : Number(email.links || 0);
  const attachments = Array.isArray(email.attachments)
    ? email.attachments.length
    : Number(email.attachments || 0);
  const riskScore = Number(email.riskScore ?? Number(email.scamProbability || 0) * 100);

  return {
    id: email.id || email._id || `email-${Date.now()}`,
    senderName,
    senderEmail,
    subject: email.subject || "(No subject)",
    preview: email.snippet || formatEmailBody(email.body).slice(0, 160) || "No preview available.",
    body: formatEmailBody(email.body) || "No email body available.",
    date: email.sentAt || email.createdAt || new Date().toISOString(),
    threatType: String(email.label || "safe").replace(/^\w/, (character) => character.toUpperCase()),
    riskScore: Math.round(riskScore),
    riskLevel: email.riskLevel || deriveRiskLevel(riskScore),
    explanation: explanationList.join(" ") || "No explanation available.",
    indicators: explanationList,
    links,
    attachments,
    modelSource: email.modelSource || "ML/phishing_mail/phishing_model.pkl",
    scoreBasis:
      email.scoreBasis ||
      "Risk score comes from the phishing model probability scaled to a 0-100 analyst score.",
  };
}

export function formatRelativeTime(value) {
  const timestamp = new Date(value);
  const diffMs = Date.now() - timestamp.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export function formatTrendLabel(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

const inputTypeDetectorMap = {
  messageText: "phishingMessaging",
  promptInput: "promptInjection",
  logText: "anomalyLogs",
  url: "maliciousUrl",
  generatedText: "aiGeneratedContent",
  imageUrl: "deepfakeImage",
  audioUrl: "deepfakeAudio",
};

function extractComponentConfidence(result, detectorKey, fallbackRiskScore) {
  if (!detectorKey) {
    return null;
  }

  const component =
    result.components?.[detectorKey] ||
    result.explainability?.components?.[detectorKey] ||
    null;

  const componentConfidence = component?.confidencePercent ?? component?.confidence;

  if (Number.isFinite(Number(componentConfidence))) {
    return normalizePercent(componentConfidence, fallbackRiskScore);
  }

  return null;
}

function extractResultConfidence(result, fallbackRiskScore, inputType) {
  const directConfidence = Number(result.confidence);

  if (Number.isFinite(directConfidence)) {
    return normalizePercent(directConfidence, fallbackRiskScore);
  }

  const channelDetector = inputTypeDetectorMap[inputType];
  const channelConfidence = extractComponentConfidence(result, channelDetector, fallbackRiskScore);

  if (channelConfidence !== null) {
    return channelConfidence;
  }

  const primaryDetector = result.explainability?.primaryDetector;
  const primaryConfidence = extractComponentConfidence(result, primaryDetector, fallbackRiskScore);

  if (primaryConfidence !== null) {
    return primaryConfidence;
  }

  return Math.round(fallbackRiskScore);
}

export function extractIndicators(input) {
  const source = String(input || "").toLowerCase();
  const indicators = [];

  const rules = [
    ["Urgency language detected", /(urgent|immediately|final notice|suspend|expires today|act now)/],
    ["Credential request pattern", /(password|otp|verify account|confirm identity|login)/],
    ["External link present", /(https?:\/\/|www\.)/],
    ["Prompt override attempt", /(ignore previous|system prompt|developer mode|reveal prompt|bypass)/],
    ["Suspicious log event", /(failed password|unauthorized access|error|exception)/],
    ["Domain spoofing cues", /(@|\.ru|\.top|\.xyz|secure-|verify-|login-)/],
  ];

  rules.forEach(([label, pattern]) => {
    if (pattern.test(source)) {
      indicators.push(label);
    }
  });

  return indicators.slice(0, 5);
}

export function normalizeAnalysisResult(result = {}, input, inputType) {
  const riskScore = Number(result.riskScore ?? result.overallRiskScore ?? result.confidence ?? 0);
  const explanationText = Array.isArray(result.explanation)
    ? result.explanation[0]
    : result.explanation || result.summary;
  const recommendationText = Array.isArray(result.recommendations)
    ? result.recommendations[0]
    : result.recommendation;
  const normalizedInputType = result.inputType || inputType;
  const indicators = Array.isArray(result.indicators) ? result.indicators.filter(Boolean) : [];

  return {
    threatType: result.threatType || result.primaryThreatType || result.prediction || "Unknown threat",
    confidence: extractResultConfidence(result, riskScore, normalizedInputType),
    riskScore,
    riskLevel: result.riskLevel || deriveRiskLevel(riskScore),
    explanation: explanationText || "No explanation was returned by the classifier.",
    recommendation: recommendationText || "Escalate the item for analyst review.",
    indicators: indicators.length ? indicators : extractIndicators(input),
    input,
    inputType: normalizedInputType,
    analyzedAt: result.analyzedAt || result.checkedAt || new Date().toISOString(),
    logId: result.logId || null,
  };
}