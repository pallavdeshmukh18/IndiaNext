const { execFile } = require("child_process");
const path = require("path");
const util = require("util");

const {
  MODEL_REGISTRY,
  hasHfToken,
  getModelRuntime,
  classifyText,
  classifyMedia
} = require("./hfModelService");

const execFileAsync = util.promisify(execFile);

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeText(input, max = 12000) {
  if (!input || typeof input !== "string") return "";
  return input.replace(/\s+/g, " ").trim().slice(0, max);
}

function mapRiskLevel(score) {
  if (score >= 75) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const normalized = String(value || "").trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function summarizeCandidates(candidates = [], limit = 3) {
  return (Array.isArray(candidates) ? candidates : [])
    .slice(0, limit)
    .map((candidate) => ({
      label: String(candidate?.label || "unknown"),
      score: clamp(Number(candidate?.score || 0), 0, 1),
      confidencePercent: Number((clamp(Number(candidate?.score || 0), 0, 1) * 100).toFixed(1))
    }));
}

function buildExplainability({
  detector,
  model,
  source,
  threatType,
  riskScore,
  riskLevel,
  label,
  confidence,
  explanation,
  indicators = [],
  candidates = []
}) {
  return {
    detector,
    model,
    source,
    threatType,
    riskScore: clamp(Number(riskScore || 0), 0, 100),
    riskLevel,
    label: label || "unknown",
    confidence: clamp(Number(confidence || 0), 0, 1),
    confidencePercent: Number((clamp(Number(confidence || 0), 0, 1) * 100).toFixed(1)),
    summary: explanation,
    indicators: uniqueStrings(indicators).slice(0, 5),
    topCandidates: summarizeCandidates(candidates)
  };
}

function matchIndicators(text, rules = []) {
  const normalized = String(text || "").toLowerCase();
  const hits = [];

  for (const rule of rules) {
    if (!rule) continue;
    const label = typeof rule === "string" ? rule : rule.label;
    const matcher = typeof rule === "string" ? rule : rule.matcher;

    if (!label || !matcher) continue;

    if (typeof matcher === "string" && normalized.includes(matcher.toLowerCase())) {
      hits.push(label);
      continue;
    }

    if (matcher instanceof RegExp && matcher.test(normalized)) {
      hits.push(label);
    }
  }

  return uniqueStrings(hits);
}

function collectUrlIndicators(url) {
  const normalized = String(url || "").trim().toLowerCase();
  if (!normalized) return [];

  const indicators = [];

  if (/@|%40/.test(normalized)) indicators.push("URL hides destination with @ encoding");
  if (/xn--/.test(normalized)) indicators.push("Punycode domain can mask lookalike characters");
  if (/https?:\/\/(\d{1,3}\.){3}\d{1,3}/.test(normalized)) indicators.push("Direct IP host instead of a normal domain");
  if (/\.(xyz|top|click|gq|tk|work|support)([\/:?#]|$)/.test(normalized)) indicators.push("High-risk top-level domain");
  if (/(login|verify|secure|update|reset|wallet|bank|kyc|otp|signin)/.test(normalized)) indicators.push("Credential-harvesting language in the URL path");

  const domain = normalized.replace(/^https?:\/\//, "").split(/[/?#]/)[0];
  const subdomainCount = domain ? Math.max(domain.split(".").length - 2, 0) : 0;
  if (subdomainCount >= 2) indicators.push("Multiple subdomains increase spoofing risk");
  if (normalized.length >= 80) indicators.push("Long URL structure is often used to obscure intent");

  return uniqueStrings(indicators);
}

function formatList(items = []) {
  const values = uniqueStrings(items);
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function simplifyIndicator(indicator) {
  const normalized = String(indicator || "").trim();
  if (!normalized) return "";

  const replacements = new Map([
    ["Urgency wording detected", "urgent wording"],
    ["Account verification request", "requests to verify an account"],
    ["Direct call-to-click language", "pushy click instructions"],
    ["Account suspension scare tactic", "account suspension threats"],
    ["Sensitive OTP request", "requests for an OTP or one-time code"],
    ["Password-related request", "password-related wording"],
    ["Banking theme detected", "banking-related wording"],
    ["URL hides destination with @ encoding", "a link that hides its real destination"],
    ["Punycode domain can mask lookalike characters", "a domain that may imitate a trusted site"],
    ["Direct IP host instead of a normal domain", "a link that uses a raw IP address instead of a normal domain"],
    ["High-risk top-level domain", "an unusual or risky web address ending"],
    ["Credential-harvesting language in the URL path", "login or verification words inside the link"],
    ["Multiple subdomains increase spoofing risk", "a long subdomain structure often used for spoofing"],
    ["Long URL structure is often used to obscure intent", "an unusually long link structure"],
    ["Instruction override attempt", "phrases that try to override earlier instructions"],
    ["References hidden system prompt", "references to hidden instructions or system prompts"],
    ["Jailbreak language detected", "jailbreak-style wording"],
    ["Safety bypass request", "attempts to bypass safety rules"],
    ["Role reassignment prompt", "language that tries to change the assistant's role"],
    ["Repeated failed authentication attempt", "repeated failed login attempts"],
    ["Unauthorized access marker", "unauthorized access wording"],
    ["Privileged command execution", "privileged command activity"],
    ["Encoded PowerShell execution", "encoded PowerShell commands"],
    ["Shell execution from log", "shell execution patterns"],
    ["SQL injection artifact", "SQL injection style text"],
    ["Sensitive file access reference", "references to sensitive files"],
    ["Privilege escalation indicator", "privilege escalation wording"],
    ["Long-form generated text sample", "very long, polished text"],
    ["Low token diversity / repetitive phrasing", "repetitive sentence patterns"],
    ["Model-style refusal phrasing detected", "AI-style refusal wording"],
    ["Image deepfake model unavailable", "limited image analysis coverage"],
    ["Audio deepfake model unavailable", "limited audio analysis coverage"]
  ]);

  if (replacements.has(normalized)) {
    return replacements.get(normalized);
  }

  return normalized.charAt(0).toLowerCase() + normalized.slice(1);
}

function inferCategoryFromSummary(baseSummary) {
  const normalized = String(baseSummary || "").toLowerCase();

  if (normalized.includes("prompt")) return "prompt";
  if (normalized.includes("url")) return "url";
  if (normalized.includes("deepfake image") || normalized.includes("image input")) return "image";
  if (normalized.includes("deepfake audio") || normalized.includes("audio input")) return "audio";
  if (normalized.includes("ai-content") || normalized.includes("generated")) return "generated";
  if (normalized.includes("log") || normalized.includes("securebert") || normalized.includes("anomal")) return "log";
  if (normalized.includes("phishing") || normalized.includes("sms") || normalized.includes("email")) return "message";

  return "content";
}

function buildCategorySentence(category, indicators = []) {
  const plainIndicators = uniqueStrings(indicators.map(simplifyIndicator)).filter(Boolean);

  if (category === "message") {
    if (plainIndicators.length) {
      return `This message was flagged because it uses ${formatList(plainIndicators.slice(0, 3))}.`;
    }
    return "This message was flagged because its wording matches patterns commonly seen in scams or phishing attempts.";
  }

  if (category === "url") {
    if (plainIndicators.length) {
      return `This link looks suspicious because it has ${formatList(plainIndicators.slice(0, 3))}.`;
    }
    return "This link looks suspicious because its structure matches patterns often seen in deceptive or unsafe URLs.";
  }

  if (category === "prompt") {
    if (plainIndicators.length) {
      return `This prompt was flagged because it contains ${formatList(plainIndicators.slice(0, 3))}.`;
    }
    return "This prompt was flagged because it looks like it is trying to override rules or extract restricted instructions.";
  }

  if (category === "log") {
    if (plainIndicators.length) {
      return `This log was flagged because it includes ${formatList(plainIndicators.slice(0, 3))}.`;
    }
    return "This log was flagged because it contains patterns often linked to suspicious system activity.";
  }

  if (category === "generated") {
    if (plainIndicators.length) {
      return `This text was flagged because it shows ${formatList(plainIndicators.slice(0, 3))}.`;
    }
    return "This text was flagged because its wording and sentence pattern look machine-generated.";
  }

  if (category === "image") {
    return "This image was flagged because some visual patterns look artificially generated or manipulated.";
  }

  if (category === "audio") {
    return "This audio was flagged because some voice patterns may be artificially generated or manipulated.";
  }

  return plainIndicators.length
    ? `This content was flagged because it contains ${formatList(plainIndicators.slice(0, 3))}.`
    : "This content was flagged because its wording and structure match suspicious patterns.";
}

function buildDetectorExplanation(baseSummary, indicators = [], candidates = []) {
  const summary = String(baseSummary || "").trim();
  const normalizedIndicators = uniqueStrings(indicators);
  const category = inferCategoryFromSummary(summary);
  const lower = summary.toLowerCase();

  if (!summary) {
    return buildCategorySentence(category, normalizedIndicators);
  }

  if (lower.startsWith("no text provided") || lower.startsWith("no url provided") || lower.startsWith("no url found") || lower.startsWith("no image input") || lower.startsWith("no audio input")) {
    return summary;
  }

  if (lower.includes("unavailable")) {
    if (category === "image") return "The image could not be checked deeply right now, so no strong conclusion was made.";
    if (category === "audio") return "The audio could not be checked deeply right now, so no strong conclusion was made.";
    return "A deeper check was not available right now, so the result may rely on lighter warning signs.";
  }

  if (lower.includes("fallback") || lower.includes("failed")) {
    const firstSentence = buildCategorySentence(category, normalizedIndicators);
    return `${firstSentence} This score was estimated from visible warning signs in the content.`;
  }

  const firstSentence = buildCategorySentence(category, normalizedIndicators);
  const secondarySentence = normalizedIndicators.length
    ? `The score increased mainly because of ${formatList(normalizedIndicators.map(simplifyIndicator).slice(0, 3))}.`
    : "The score increased because the overall wording and structure matched risky patterns.";

  return `${firstSentence} ${secondarySentence}`;
}

function buildCheckSentence(result) {
  if (!result) return null;

  if (result.riskScore >= 40) {
    return result.explanation;
  }

  if (result.detector === "maliciousUrl" && result.source === "none") {
    return "No suspicious link was found in the text.";
  }

  if ((result.indicators || []).length > 0) {
    return `A smaller warning sign was noticed: ${formatList(result.indicators.map(simplifyIndicator).slice(0, 2))}.`;
  }

  return null;
}

function extractFirstUrl(text) {
  if (!text || typeof text !== "string") return null;
  const match = text.match(URL_REGEX);
  if (!match || !match[0]) return null;
  return match[0].replace(/[)\].,!?]+$/, "");
}

function safeToLower(value) {
  return String(value || "").toLowerCase();
}

function isZeroShotModel(modelId) {
  return safeToLower(modelId).includes("bart-large-mnli");
}

function scoreFromClassifier(score, minIfPositive = 55, maxIfNegative = 30, isPositive = false) {
  const normalized = clamp(Number(score || 0), 0, 1);
  if (isPositive) {
    return clamp(Math.round(normalized * 100), minIfPositive, 100);
  }
  return clamp(Math.round((1 - normalized) * maxIfNegative), 0, maxIfNegative);
}

function buildDetectorOutput({
  detector,
  model,
  threatType,
  isSuspicious,
  riskScore,
  explanation,
  label,
  confidence,
  candidates,
  indicators = [],
  explainability,
  source = "huggingface"
}) {
  const normalizedRiskScore = clamp(Number(riskScore || 0), 0, 100);
  const riskLevel = mapRiskLevel(normalizedRiskScore);
  const normalizedIndicators = uniqueStrings(indicators);
  const normalizedCandidates = Array.isArray(candidates) ? candidates.slice(0, 5) : [];
  const finalExplanation = String(explanation || "").trim() || "No explanation returned.";

  return {
    detector,
    model,
    source,
    threatType,
    isSuspicious,
    riskScore: normalizedRiskScore,
    riskLevel,
    confidence: clamp(Number(confidence || 0), 0, 1),
    label: label || "unknown",
    explanation: finalExplanation,
    indicators: normalizedIndicators,
    explainability:
      explainability ||
      buildExplainability({
        detector,
        model,
        source,
        threatType,
        riskScore: normalizedRiskScore,
        riskLevel,
        label,
        confidence,
        explanation: finalExplanation,
        indicators: normalizedIndicators,
        candidates: normalizedCandidates
      }),
    candidates: normalizedCandidates
  };
}

async function detectPhishingMessaging(text) {
  const normalized = normalizeText(text);
  const keywordIndicators = matchIndicators(normalized, [
    { matcher: "urgent", label: "Urgency wording detected" },
    { matcher: "verify your account", label: "Account verification request" },
    { matcher: "click here", label: "Direct call-to-click language" },
    { matcher: "account suspended", label: "Account suspension scare tactic" },
    { matcher: "otp", label: "Sensitive OTP request" },
    { matcher: "password", label: "Password-related request" },
    { matcher: "bank", label: "Banking theme detected" }
  ]);
  if (!normalized) {
    return buildDetectorOutput({
      detector: "phishingMessaging",
      model: MODEL_REGISTRY.phishingMessaging,
      source: "none",
      threatType: "None",
      isSuspicious: false,
      riskScore: 0,
      explanation: "No text provided for phishing-message detection.",
      label: "none",
      confidence: 0,
      indicators: []
    });
  }

  try {
    const prediction = await classifyText(
      MODEL_REGISTRY.phishingMessaging,
      normalized,
      isZeroShotModel(MODEL_REGISTRY.phishingMessaging)
        ? { candidate_labels: ["phishing message", "benign message"], multi_label: false }
        : {}
    );
    const label = safeToLower(prediction.label);
    const positive =
      label.includes("phishing") ||
      label.includes("phish") ||
      label.includes("spam") ||
      label.includes("fraud") ||
      label.includes("scam") ||
      label.includes("malicious");

    const riskScore = scoreFromClassifier(prediction.score, 55, 30, positive);

    return buildDetectorOutput({
      detector: "phishingMessaging",
      model: MODEL_REGISTRY.phishingMessaging,
      threatType: positive ? "Phishing Message" : "None",
      isSuspicious: positive && riskScore >= 40,
      riskScore,
      label: prediction.label,
      confidence: prediction.score,
      candidates: prediction.candidates,
      indicators: keywordIndicators,
      explanation: buildDetectorExplanation(
        `Email/SMS phishing classifier label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`,
        keywordIndicators,
        prediction.candidates
      )
    });
  } catch (error) {
    const lower = normalized.toLowerCase();
    const heuristicKeywords = [
      "urgent",
      "verify your account",
      "password",
      "bank",
      "click here",
      "account suspended",
      "otp"
    ];
    let hits = 0;
    for (const keyword of heuristicKeywords) {
      if (lower.includes(keyword)) hits += 1;
    }
    const riskScore = clamp(10 + hits * 16, 0, 100);
    const isSuspicious = riskScore >= 40;

    return buildDetectorOutput({
      detector: "phishingMessaging",
      model: MODEL_REGISTRY.phishingMessaging,
      source: "heuristic_fallback",
      threatType: isSuspicious ? "Phishing Message" : "None",
      isSuspicious,
      riskScore,
      label: "heuristic",
      confidence: hits ? clamp(hits / heuristicKeywords.length, 0, 1) : 0,
      indicators: keywordIndicators,
      explanation: buildDetectorExplanation(
        `Fallback heuristic applied because model call failed: ${error.message}`,
        keywordIndicators
      )
    });
  }
}

async function runLocalUrlModel(url) {
  const scriptPath = path.join(__dirname, "..", "..", "ML", "phishing_url", "predict.py");
  const { stdout } = await execFileAsync("python", [scriptPath, url], {
    timeout: 20000
  });
  const parsed = JSON.parse(String(stdout || "").trim());
  if (parsed.error) {
    throw new Error(parsed.error);
  }

  return {
    label: parsed.threatType || "Suspicious URL",
    score: clamp(Number(parsed.riskScore || 0) / 100, 0, 1),
    riskScore: clamp(Number(parsed.riskScore || 0), 0, 100),
    explanation: parsed.explanation || "Local URL model completed."
  };
}

async function detectMaliciousUrl(urlInput) {
  const normalizedUrl = normalizeText(urlInput, 2048);
  const urlIndicators = collectUrlIndicators(normalizedUrl);
  if (!normalizedUrl) {
    return buildDetectorOutput({
      detector: "maliciousUrl",
      model: MODEL_REGISTRY.maliciousUrl,
      source: "none",
      threatType: "None",
      isSuspicious: false,
      riskScore: 0,
      explanation: "No URL provided for malicious-URL detection.",
      label: "none",
      confidence: 0,
      indicators: []
    });
  }

  try {
    const prediction = await classifyText(
      MODEL_REGISTRY.maliciousUrl,
      normalizedUrl,
      isZeroShotModel(MODEL_REGISTRY.maliciousUrl)
        ? {
            candidate_labels: [
              "phishing url",
              "malware url",
              "defacement url",
              "benign url"
            ],
            multi_label: false
          }
        : {}
    );
    const label = safeToLower(prediction.label);
    let threatType = "None";
    let riskScore = 20;

    if (label.includes("malware") || label === "label_3") {
      threatType = "Malware URL";
      riskScore = Math.max(90, Math.round(prediction.score * 100));
    } else if (label.includes("phish") || label === "label_2") {
      threatType = "Phishing URL";
      riskScore = Math.max(82, Math.round(prediction.score * 100));
    } else if (label.includes("deface") || label === "label_1") {
      threatType = "Defacement URL";
      riskScore = Math.max(65, Math.round(prediction.score * 100));
    } else if (label.includes("benign") || label.includes("safe") || label === "label_0") {
      threatType = "None";
      riskScore = Math.min(25, Math.round((1 - prediction.score) * 30));
    } else {
      threatType = "Suspicious URL";
      riskScore = clamp(Math.round(prediction.score * 100), 35, 70);
    }

    return buildDetectorOutput({
      detector: "maliciousUrl",
      model: MODEL_REGISTRY.maliciousUrl,
      threatType,
      isSuspicious: riskScore >= 40 && threatType !== "None",
      riskScore,
      label: prediction.label,
      confidence: prediction.score,
      candidates: prediction.candidates,
      indicators: urlIndicators,
      explanation: buildDetectorExplanation(
        `URL classifier label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`,
        urlIndicators,
        prediction.candidates
      )
    });
  } catch (hfError) {
    try {
      const local = await runLocalUrlModel(normalizedUrl);
      return buildDetectorOutput({
        detector: "maliciousUrl",
        model: MODEL_REGISTRY.maliciousUrl,
        source: "local_model_fallback",
        threatType: local.riskScore >= 40 ? local.label : "None",
        isSuspicious: local.riskScore >= 40,
        riskScore: local.riskScore,
        label: local.label,
        confidence: local.score,
        indicators: urlIndicators,
        explanation: buildDetectorExplanation(
          `Used local URL model fallback. ${local.explanation}`,
          urlIndicators
        )
      });
    } catch (localError) {
      const lower = normalizedUrl.toLowerCase();
      const riskyHints = [".xyz", ".top", "login", "verify", "secure", "@", "%40"];
      let hits = 0;
      for (const hint of riskyHints) {
        if (lower.includes(hint)) hits += 1;
      }
      const riskScore = clamp(25 + hits * 12, 0, 100);

      return buildDetectorOutput({
        detector: "maliciousUrl",
        model: MODEL_REGISTRY.maliciousUrl,
        source: "heuristic_fallback",
        threatType: riskScore >= 40 ? "Suspicious URL" : "None",
        isSuspicious: riskScore >= 40,
        riskScore,
        label: "heuristic",
        confidence: clamp(hits / riskyHints.length, 0, 1),
        indicators: urlIndicators,
        explanation: buildDetectorExplanation(
          `Fallback heuristic used because HF and local model failed. HF error: ${hfError.message}. Local error: ${localError.message}.`,
          urlIndicators
        )
      });
    }
  }
}

async function detectPromptInjection(text) {
  const normalized = normalizeText(text);
  const promptIndicators = matchIndicators(normalized, [
    { matcher: "ignore previous instructions", label: "Instruction override attempt" },
    { matcher: "system prompt", label: "References hidden system prompt" },
    { matcher: "jailbreak", label: "Jailbreak language detected" },
    { matcher: "bypass", label: "Safety bypass request" },
    { matcher: "you are now", label: "Role reassignment prompt" }
  ]);
  if (!normalized) {
    return buildDetectorOutput({
      detector: "promptInjection",
      model: MODEL_REGISTRY.promptInjection,
      source: "none",
      threatType: "None",
      isSuspicious: false,
      riskScore: 0,
      explanation: "No text provided for prompt-injection detection.",
      label: "none",
      confidence: 0,
      indicators: []
    });
  }

  try {
    const prediction = await classifyText(MODEL_REGISTRY.promptInjection, normalized);
    const label = safeToLower(prediction.label);
    const positive =
      label.includes("inject") ||
      label.includes("jailbreak") ||
      label.includes("attack") ||
      label.includes("unsafe");

    const riskScore = scoreFromClassifier(prediction.score, 60, 25, positive);

    return buildDetectorOutput({
      detector: "promptInjection",
      model: MODEL_REGISTRY.promptInjection,
      threatType: positive ? "Prompt Injection" : "None",
      isSuspicious: positive && riskScore >= 40,
      riskScore,
      label: prediction.label,
      confidence: prediction.score,
      candidates: prediction.candidates,
      indicators: promptIndicators,
      explanation: buildDetectorExplanation(
        `Prompt guard model label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`,
        promptIndicators,
        prediction.candidates
      )
    });
  } catch (error) {
    const lower = normalized.toLowerCase();
    const keywords = [
      "ignore previous instructions",
      "system prompt",
      "jailbreak",
      "bypass",
      "you are now"
    ];
    let hits = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) hits += 1;
    }
    const riskScore = clamp(12 + hits * 24, 0, 100);

    return buildDetectorOutput({
      detector: "promptInjection",
      model: MODEL_REGISTRY.promptInjection,
      source: "heuristic_fallback",
      threatType: riskScore >= 40 ? "Prompt Injection" : "None",
      isSuspicious: riskScore >= 40,
      riskScore,
      label: "heuristic",
      confidence: clamp(hits / keywords.length, 0, 1),
      indicators: promptIndicators,
      explanation: buildDetectorExplanation(
        `Fallback heuristic applied because prompt-guard model call failed: ${error.message}`,
        promptIndicators
      )
    });
  }
}

async function detectAnomalousLog(logText) {
  const normalized = normalizeText(logText);
  const logIndicators = matchIndicators(normalized, [
    { matcher: "failed password", label: "Repeated failed authentication attempt" },
    { matcher: "unauthorized", label: "Unauthorized access marker" },
    { matcher: "sudo", label: "Privileged command execution" },
    { matcher: "powershell -enc", label: "Encoded PowerShell execution" },
    { matcher: "cmd.exe /c", label: "Shell execution from log" },
    { matcher: "union select", label: "SQL injection artifact" },
    { matcher: "/etc/passwd", label: "Sensitive file access reference" },
    { matcher: "privilege escalation", label: "Privilege escalation indicator" }
  ]);
  if (!normalized) {
    return buildDetectorOutput({
      detector: "anomalyLogs",
      model: MODEL_REGISTRY.anomalyLogs,
      source: "none",
      threatType: "None",
      isSuspicious: false,
      riskScore: 0,
      explanation: "No log text provided for anomaly detection.",
      label: "none",
      confidence: 0,
      indicators: []
    });
  }

  try {
    const prediction = await classifyText(
      MODEL_REGISTRY.anomalyLogs,
      normalized,
      isZeroShotModel(MODEL_REGISTRY.anomalyLogs)
        ? { candidate_labels: ["anomalous log", "benign log"], multi_label: false }
        : {}
    );
    const label = safeToLower(prediction.label);
    const positive =
      label.includes("anomal") ||
      label === "label_1" ||
      label.includes("anomaly") ||
      label.includes("attack") ||
      label.includes("intrusion") ||
      label.includes("malicious") ||
      label.includes("suspicious");

    const riskScore = scoreFromClassifier(prediction.score, 55, 25, positive);

    return buildDetectorOutput({
      detector: "anomalyLogs",
      model: MODEL_REGISTRY.anomalyLogs,
      threatType: positive ? "Anomalous Behavior" : "None",
      isSuspicious: positive && riskScore >= 40,
      riskScore,
      label: prediction.label,
      confidence: prediction.score,
      candidates: prediction.candidates,
      indicators: logIndicators,
      explanation: buildDetectorExplanation(
        `SecureBERT label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`,
        logIndicators,
        prediction.candidates
      )
    });
  } catch (error) {
    const lower = normalized.toLowerCase();
    const indicators = [
      "failed password",
      "unauthorized",
      "sudo",
      "powershell -enc",
      "cmd.exe /c",
      "union select",
      "/etc/passwd",
      "privilege escalation"
    ];
    let hits = 0;
    for (const marker of indicators) {
      if (lower.includes(marker)) hits += 1;
    }
    const riskScore = clamp(15 + hits * 14, 0, 100);

    return buildDetectorOutput({
      detector: "anomalyLogs",
      model: MODEL_REGISTRY.anomalyLogs,
      source: "heuristic_fallback",
      threatType: riskScore >= 40 ? "Anomalous Behavior" : "None",
      isSuspicious: riskScore >= 40,
      riskScore,
      label: "heuristic",
      confidence: clamp(hits / indicators.length, 0, 1),
      indicators: logIndicators,
      explanation: buildDetectorExplanation(
        `Fallback heuristic applied because SecureBERT call failed: ${error.message}`,
        logIndicators
      )
    });
  }
}

async function detectAIGeneratedText(text) {
  const normalized = normalizeText(text);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const uniqueTokens = new Set(tokens.map((token) => token.toLowerCase()));
  const diversity = tokens.length ? uniqueTokens.size / tokens.length : 0;
  const aiIndicators = [];
  if (tokens.length >= 40) aiIndicators.push("Long-form generated text sample");
  if (diversity <= 0.62) aiIndicators.push("Low token diversity / repetitive phrasing");
  if (/(as an ai|language model|i cannot comply|i cannot provide)/i.test(normalized)) {
    aiIndicators.push("Model-style refusal phrasing detected");
  }
  if (!normalized) {
    return buildDetectorOutput({
      detector: "aiGeneratedContent",
      model: MODEL_REGISTRY.aiGeneratedText,
      source: "none",
      threatType: "None",
      isSuspicious: false,
      riskScore: 0,
      explanation: "No text provided for AI-generated-content detection.",
      label: "none",
      confidence: 0,
      indicators: []
    });
  }

  try {
    const prediction = await classifyText(MODEL_REGISTRY.aiGeneratedText, normalized);
    const label = safeToLower(prediction.label);
    const positive =
      label.includes("ai") ||
      label.includes("generated") ||
      label.includes("fake") ||
      label.includes("machine");

    const riskScore = scoreFromClassifier(prediction.score, 50, 30, positive);

    return buildDetectorOutput({
      detector: "aiGeneratedContent",
      model: MODEL_REGISTRY.aiGeneratedText,
      threatType: positive ? "AI-Generated Content" : "None",
      isSuspicious: positive && riskScore >= 40,
      riskScore,
      label: prediction.label,
      confidence: prediction.score,
      candidates: prediction.candidates,
      indicators: aiIndicators,
      explanation: buildDetectorExplanation(
        `AI-content detector label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`,
        aiIndicators,
        prediction.candidates
      )
    });
  } catch (error) {
    const riskScore = clamp(Math.round((1 - diversity) * 80), 0, 100);

    return buildDetectorOutput({
      detector: "aiGeneratedContent",
      model: MODEL_REGISTRY.aiGeneratedText,
      source: "heuristic_fallback",
      threatType: riskScore >= 45 ? "AI-Generated Content" : "None",
      isSuspicious: riskScore >= 45,
      riskScore,
      label: "heuristic",
      confidence: clamp(1 - diversity, 0, 1),
      indicators: aiIndicators,
      explanation: buildDetectorExplanation(
        `Fallback burstiness heuristic used because detector call failed: ${error.message}`,
        aiIndicators
      )
    });
  }
}

async function detectDeepfakeImage(mediaInput) {
  if (!mediaInput) {
    return buildDetectorOutput({
      detector: "deepfakeImage",
      model: MODEL_REGISTRY.deepfakeImage,
      source: "none",
      threatType: "None",
      isSuspicious: false,
      riskScore: 0,
      explanation: "No image input provided for deepfake image detection.",
      label: "none",
      confidence: 0,
      indicators: []
    });
  }

  try {
    const prediction = await classifyMedia(
      MODEL_REGISTRY.deepfakeImage,
      mediaInput,
      "image/jpeg"
    );
    const label = safeToLower(prediction.label);
    const positive =
      label.includes("deepfake") ||
      label.includes("fake") ||
      label.includes("spoof") ||
      label.includes("synthetic");
    const riskScore = scoreFromClassifier(prediction.score, 65, 25, positive);

    return buildDetectorOutput({
      detector: "deepfakeImage",
      model: MODEL_REGISTRY.deepfakeImage,
      threatType: positive ? "Deepfake Image" : "None",
      isSuspicious: positive && riskScore >= 40,
      riskScore,
      label: prediction.label,
      confidence: prediction.score,
      candidates: prediction.candidates,
      indicators: prediction.candidates
        .filter((candidate) => /deepfake|fake|spoof|synthetic/i.test(String(candidate?.label || "")))
        .map((candidate) => `Synthetic-media candidate: ${candidate.label}`),
      explanation: buildDetectorExplanation(
        `Deepfake image classifier label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`,
        prediction.candidates
          .filter((candidate) => /deepfake|fake|spoof|synthetic/i.test(String(candidate?.label || "")))
          .map((candidate) => `Synthetic-media candidate: ${candidate.label}`),
        prediction.candidates
      )
    });
  } catch (error) {
    return buildDetectorOutput({
      detector: "deepfakeImage",
      model: MODEL_REGISTRY.deepfakeImage,
      source: "model_error",
      threatType: "Unknown",
      isSuspicious: false,
      riskScore: 0,
      label: "unavailable",
      confidence: 0,
      indicators: ["Image deepfake model unavailable"],
      explanation: buildDetectorExplanation(
        `Deepfake image model unavailable: ${error.message}`,
        ["Image deepfake model unavailable"]
      )
    });
  }
}

async function detectDeepfakeAudio(mediaInput) {
  if (!mediaInput) {
    return buildDetectorOutput({
      detector: "deepfakeAudio",
      model: MODEL_REGISTRY.deepfakeAudio,
      source: "none",
      threatType: "None",
      isSuspicious: false,
      riskScore: 0,
      explanation: "No audio input provided for deepfake audio detection.",
      label: "none",
      confidence: 0,
      indicators: []
    });
  }

  try {
    const prediction = await classifyMedia(
      MODEL_REGISTRY.deepfakeAudio,
      mediaInput,
      "audio/mpeg"
    );
    const label = safeToLower(prediction.label);
    const positive =
      label.includes("deepfake") ||
      label.includes("fake") ||
      label.includes("spoof") ||
      label.includes("synthetic");
    const riskScore = scoreFromClassifier(prediction.score, 65, 25, positive);

    return buildDetectorOutput({
      detector: "deepfakeAudio",
      model: MODEL_REGISTRY.deepfakeAudio,
      threatType: positive ? "Deepfake Audio" : "None",
      isSuspicious: positive && riskScore >= 40,
      riskScore,
      label: prediction.label,
      confidence: prediction.score,
      candidates: prediction.candidates,
      indicators: prediction.candidates
        .filter((candidate) => /deepfake|fake|spoof|synthetic/i.test(String(candidate?.label || "")))
        .map((candidate) => `Synthetic-audio candidate: ${candidate.label}`),
      explanation: buildDetectorExplanation(
        `Deepfake audio classifier label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`,
        prediction.candidates
          .filter((candidate) => /deepfake|fake|spoof|synthetic/i.test(String(candidate?.label || "")))
          .map((candidate) => `Synthetic-audio candidate: ${candidate.label}`),
        prediction.candidates
      )
    });
  } catch (error) {
    return buildDetectorOutput({
      detector: "deepfakeAudio",
      model: MODEL_REGISTRY.deepfakeAudio,
      source: "model_error",
      threatType: "Unknown",
      isSuspicious: false,
      riskScore: 0,
      label: "unavailable",
      confidence: 0,
      indicators: ["Audio deepfake model unavailable"],
      explanation: buildDetectorExplanation(
        `Deepfake audio model unavailable: ${error.message}`,
        ["Audio deepfake model unavailable"]
      )
    });
  }
}

function summarizeSuite(checks) {
  const results = Object.values(checks || {});
  if (!results.length) {
    return "No content was available to explain.";
  }

  const primary = pickPrimaryThreat(checks);
  const suspiciousResults = results.filter((result) => Number(result?.riskScore || 0) >= 40);

  if (!primary || primary.riskScore < 40) {
    const softSignals = uniqueStrings(results.flatMap((result) => result.indicators || []).map(simplifyIndicator)).slice(0, 3);
    if (softSignals.length) {
      return `Nothing strongly suspicious was found, but the content still showed ${formatList(softSignals)}.`;
    }
    return "Nothing strongly suspicious was found in the wording, structure, or links.";
  }

  const parts = [primary.explanation];

  const secondarySignals = suspiciousResults
    .filter((result) => result !== primary)
    .map((result) => buildCheckSentence(result))
    .filter(Boolean)
    .slice(0, 2);

  if (secondarySignals.length) {
    parts.push(`Other warning signs: ${secondarySignals.join(" ")}`);
  }

  return parts.join(" ");
}

function pickPrimaryThreat(checks) {
  let primary = null;
  for (const item of Object.values(checks)) {
    if (!primary || item.riskScore > primary.riskScore) {
      primary = item;
    }
  }
  return primary;
}

async function runSecuritySuiteScan(payload = {}) {
  const {
    messageText,
    url,
    promptInput,
    logText,
    generatedText,
    imageUrl,
    imageBase64,
    audioUrl,
    audioBase64
  } = payload;

  const checks = {};
  const jobs = [];

  if (messageText) {
    jobs.push(
      detectPhishingMessaging(messageText).then((result) => {
        checks.phishingMessaging = result;
      })
    );
  }

  if (url) {
    jobs.push(
      detectMaliciousUrl(url).then((result) => {
        checks.maliciousUrl = result;
      })
    );
  }

  if (promptInput) {
    jobs.push(
      detectPromptInjection(promptInput).then((result) => {
        checks.promptInjection = result;
      })
    );
  }

  if (logText) {
    jobs.push(
      detectAnomalousLog(logText).then((result) => {
        checks.anomalyLogs = result;
      })
    );
  }

  if (generatedText) {
    jobs.push(
      detectAIGeneratedText(generatedText).then((result) => {
        checks.aiGeneratedContent = result;
      })
    );
  }

  if (imageUrl || imageBase64) {
    jobs.push(
      detectDeepfakeImage(imageUrl ? { url: imageUrl } : { base64: imageBase64 }).then(
        (result) => {
          checks.deepfakeImage = result;
        }
      )
    );
  }

  if (audioUrl || audioBase64) {
    jobs.push(
      detectDeepfakeAudio(audioUrl ? { url: audioUrl } : { base64: audioBase64 }).then(
        (result) => {
          checks.deepfakeAudio = result;
        }
      )
    );
  }

  await Promise.all(jobs);

  const primary = pickPrimaryThreat(checks);
  const overallRiskScore = primary ? primary.riskScore : 0;
  const primaryThreatType = primary && primary.riskScore >= 40 ? primary.threatType : "None";

  return {
    checkedAt: new Date().toISOString(),
    hfTokenConfigured: hasHfToken(),
    runtime: getModelRuntime(),
    models: MODEL_REGISTRY,
    checks,
    primaryThreatType,
    overallRiskScore,
    riskLevel: mapRiskLevel(overallRiskScore),
    isSuspicious: overallRiskScore >= 40,
    indicators: uniqueStrings(Object.values(checks).flatMap((result) => result.indicators || [])).slice(0, 8),
    summary: summarizeSuite(checks)
  };
}

async function analyzeUnifiedThreatInput(input) {
  const normalizedInput = normalizeText(input, 10000);
  const firstUrl = extractFirstUrl(normalizedInput);

  const [phishing, promptInjection, maliciousUrl] = await Promise.all([
    detectPhishingMessaging(normalizedInput),
    detectPromptInjection(normalizedInput),
    firstUrl
      ? detectMaliciousUrl(firstUrl)
      : Promise.resolve(
          buildDetectorOutput({
            detector: "maliciousUrl",
            model: MODEL_REGISTRY.maliciousUrl,
            source: "none",
            threatType: "None",
            isSuspicious: false,
            riskScore: 0,
            explanation: "No URL found in the input.",
            label: "none",
            confidence: 0
          })
        )
  ]);

  const checks = {
    phishingMessaging: phishing,
    promptInjection,
    maliciousUrl
  };

  const primary = pickPrimaryThreat(checks);
  const riskScore = primary ? primary.riskScore : 0;

  return {
    isSuspicious: riskScore >= 40,
    riskScore,
    riskLevel: mapRiskLevel(riskScore),
    threatType: primary && riskScore >= 40 ? primary.threatType : "None",
    explanation: primary?.explanation || summarizeSuite(checks),
    indicators: uniqueStrings(
      (primary?.indicators && primary.indicators.length
        ? primary.indicators
        : Object.values(checks).flatMap((result) => result.indicators || []))
    ).slice(0, 6),
    explainability: {
      summary: summarizeSuite(checks),
      primaryDetector: primary?.detector || null,
      primaryModel: primary?.model || null,
      indicators: uniqueStrings(
        (primary?.indicators && primary.indicators.length
          ? primary.indicators
          : Object.values(checks).flatMap((result) => result.indicators || []))
      ).slice(0, 6),
      components: Object.fromEntries(
        Object.entries(checks).map(([key, value]) => [key, value.explainability || null])
      )
    },
    components: checks
  };
}

module.exports = {
  runSecuritySuiteScan,
  analyzeUnifiedThreatInput,
  detectPhishingMessaging,
  detectMaliciousUrl
};
