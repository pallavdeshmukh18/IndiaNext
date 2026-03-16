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

function extractFirstUrl(text) {
  if (!text || typeof text !== "string") return null;
  const match = text.match(URL_REGEX);
  if (!match || !match[0]) return null;
  return match[0].replace(/[)\].,!?]+$/, "");
}

function safeToLower(value) {
  return String(value || "").toLowerCase();
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
  source = "huggingface"
}) {
  return {
    detector,
    model,
    source,
    threatType,
    isSuspicious,
    riskScore: clamp(Number(riskScore || 0), 0, 100),
    confidence: clamp(Number(confidence || 0), 0, 1),
    label: label || "unknown",
    explanation,
    candidates: Array.isArray(candidates) ? candidates.slice(0, 5) : []
  };
}

async function detectPhishingMessaging(text) {
  const normalized = normalizeText(text);
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
      confidence: 0
    });
  }

  try {
    const prediction = await classifyText(MODEL_REGISTRY.phishingMessaging, normalized);
    const label = safeToLower(prediction.label);
    const positive =
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
      explanation: `Email/SMS phishing classifier label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`
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
      explanation: `Fallback heuristic applied because model call failed: ${error.message}`
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
      confidence: 0
    });
  }

  try {
    const prediction = await classifyText(MODEL_REGISTRY.maliciousUrl, normalizedUrl);
    const label = safeToLower(prediction.label);
    let threatType = "None";
    let riskScore = 20;

    if (label.includes("malware")) {
      threatType = "Malware URL";
      riskScore = Math.max(90, Math.round(prediction.score * 100));
    } else if (label.includes("phish")) {
      threatType = "Phishing URL";
      riskScore = Math.max(82, Math.round(prediction.score * 100));
    } else if (label.includes("deface")) {
      threatType = "Defacement URL";
      riskScore = Math.max(65, Math.round(prediction.score * 100));
    } else if (label.includes("benign") || label.includes("safe")) {
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
      explanation: `URL classifier label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`
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
        explanation: `Used local URL model fallback. ${local.explanation}`
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
        explanation: `Fallback heuristic used because HF and local model failed. HF error: ${hfError.message}. Local error: ${localError.message}.`
      });
    }
  }
}

async function detectPromptInjection(text) {
  const normalized = normalizeText(text);
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
      confidence: 0
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
      explanation: `Prompt guard model label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`
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
      explanation: `Fallback heuristic applied because prompt-guard model call failed: ${error.message}`
    });
  }
}

async function detectAnomalousLog(logText) {
  const normalized = normalizeText(logText);
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
      confidence: 0
    });
  }

  try {
    const prediction = await classifyText(MODEL_REGISTRY.anomalyLogs, normalized);
    const label = safeToLower(prediction.label);
    const positive =
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
      explanation: `SecureBERT label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`
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
      explanation: `Fallback heuristic applied because SecureBERT call failed: ${error.message}`
    });
  }
}

async function detectAIGeneratedText(text) {
  const normalized = normalizeText(text);
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
      confidence: 0
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
      explanation: `AI-content detector label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`
    });
  } catch (error) {
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const uniqueTokens = new Set(tokens.map((token) => token.toLowerCase()));
    const diversity = tokens.length ? uniqueTokens.size / tokens.length : 0;
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
      explanation: `Fallback burstiness heuristic used because detector call failed: ${error.message}`
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
      confidence: 0
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
      explanation: `Deepfake image classifier label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`
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
      explanation: `Deepfake image model unavailable: ${error.message}`
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
      confidence: 0
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
      explanation: `Deepfake audio classifier label: ${prediction.label} (${(prediction.score * 100).toFixed(1)}%).`
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
      explanation: `Deepfake audio model unavailable: ${error.message}`
    });
  }
}

function summarizeSuite(checks) {
  const summaries = [];
  for (const [name, result] of Object.entries(checks)) {
    summaries.push(
      `${name}: ${result.threatType} (${result.riskScore}%) via ${result.source}`
    );
  }
  return summaries.join(" | ");
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
    threatType: primary && riskScore >= 40 ? primary.threatType : "None",
    explanation: summarizeSuite(checks),
    components: checks
  };
}

module.exports = {
  runSecuritySuiteScan,
  analyzeUnifiedThreatInput
};
