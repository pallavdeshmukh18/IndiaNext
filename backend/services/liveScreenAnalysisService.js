const {
  MODEL_REGISTRY,
  extractTextFromImage
} = require("./hfModelService");
const {
  detectPhishingMessaging,
  detectMaliciousUrl
} = require("./securitySuiteService");

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeText(input, max = 12000) {
  if (!input || typeof input !== "string") return "";
  return input.replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeHost(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./i, "");
  } catch (_error) {
    return "";
  }
}

function matchesDomain(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

const BRAND_RULES = [
  { brand: "PayPal", keywords: ["paypal"], domains: ["paypal.com", "paypalobjects.com"] },
  { brand: "Google", keywords: ["google", "gmail", "google workspace"], domains: ["google.com", "googleapis.com", "gmail.com"] },
  { brand: "Microsoft", keywords: ["microsoft", "outlook", "office 365", "onedrive"], domains: ["microsoft.com", "live.com", "outlook.com", "office.com"] },
  { brand: "Apple", keywords: ["apple", "icloud", "apple id"], domains: ["apple.com", "icloud.com"] },
  { brand: "Amazon", keywords: ["amazon", "aws"], domains: ["amazon.com", "amazon.in", "amazonaws.com"] },
  { brand: "Meta", keywords: ["facebook", "instagram", "meta"], domains: ["facebook.com", "instagram.com", "meta.com"] },
  { brand: "WhatsApp", keywords: ["whatsapp"], domains: ["whatsapp.com"] },
  { brand: "LinkedIn", keywords: ["linkedin"], domains: ["linkedin.com"] },
  { brand: "Netflix", keywords: ["netflix"], domains: ["netflix.com"] },
  { brand: "Dropbox", keywords: ["dropbox"], domains: ["dropbox.com"] },
  { brand: "SBI", keywords: ["state bank of india", "sbi"], domains: ["sbi.co.in", "onlinesbi.sbi"] },
  { brand: "HDFC Bank", keywords: ["hdfc", "hdfc bank"], domains: ["hdfcbank.com"] },
  { brand: "ICICI Bank", keywords: ["icici", "icici bank"], domains: ["icicibank.com"] },
  { brand: "Axis Bank", keywords: ["axis bank", "axisbank"], domains: ["axisbank.com"] }
];

function detectBrand(textBlob, host) {
  const haystack = normalizeText(textBlob, 20000).toLowerCase();
  let best = null;

  for (const rule of BRAND_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matches = haystack.match(new RegExp(`\\b${escaped}\\b`, "g"));
      score += matches ? matches.length : 0;
      if (host && host.includes(keyword.replace(/\s+/g, ""))) {
        score += 1;
      }
    }

    if (!best || score > best.score) {
      best = {
        brand: rule.brand,
        expectedDomains: rule.domains,
        keywords: rule.keywords,
        score
      };
    }
  }

  return best && best.score > 0 ? best : null;
}

function computeHeuristics({ host, pageUrl, title, pageSignals, ocrText, phishingResult, urlResult }) {
  const reasons = [];
  let score = 0;

  const signals = pageSignals || {};
  const combinedText = normalizeText(
    [title, signals.metaDescription, signals.visibleText, ocrText].filter(Boolean).join(" "),
    20000
  ).toLowerCase();
  const brandSignal = detectBrand(combinedText, host);

  const loginLike =
    Number(signals.passwordFields || 0) > 0 ||
    /\b(sign in|log in|login|verify account|account verification|one-time password|otp|2fa|secure login)\b/i.test(combinedText);

  if (Number(signals.forms || 0) > 0) {
    score += 8;
    reasons.push("Page contains one or more forms.");
  }

  if (Number(signals.passwordFields || 0) > 0) {
    score += 14;
    reasons.push("Password field detected on the page.");
  }

  if (loginLike) {
    score += 10;
    reasons.push("Login or account-verification language is visible.");
  }

  if (Number(signals.suspiciousKeywordHits || 0) > 0) {
    score += clamp(Number(signals.suspiciousKeywordHits || 0) * 4, 4, 16);
    reasons.push("Urgency or account-security keywords were detected.");
  }

  if (Number(signals.suspiciousLinkCount || 0) > 0) {
    score += clamp(Number(signals.suspiciousLinkCount || 0) * 4, 6, 18);
    reasons.push("Suspicious links or redirect-style URLs were found in the page.");
  }

  if (
    Number(signals.externalLinkCount || 0) >= 4 &&
    Number(signals.externalLinkCount || 0) >= Math.ceil(Number(signals.linkCount || 0) * 0.5)
  ) {
    score += 8;
    reasons.push("The page sends users to many external destinations.");
  }

  if (/\b(urgent|immediately|suspended|limited|verify now|confirm identity)\b/i.test(ocrText)) {
    score += 10;
    reasons.push("OCR found urgency language in the captured screen.");
  }

  if (brandSignal) {
    score += 8;
    reasons.push(`Brand markers suggest the page is presenting itself as ${brandSignal.brand}.`);

    const trusted = brandSignal.expectedDomains.some((domain) => matchesDomain(host, domain));
    if (!trusted && host) {
      score += loginLike ? 38 : 28;
      reasons.push(
        `${brandSignal.brand} branding appears on ${host}, which does not match the expected domain.`
      );
    }
  }

  if (/\.(xyz|top|click|shop|info|buzz|monster)$/i.test(host)) {
    score += 8;
    reasons.push("The current domain uses a high-risk top-level domain.");
  }

  if (phishingResult && phishingResult.riskScore >= 40) {
    reasons.push(`Phishing-text classifier flagged the page context at ${phishingResult.riskScore}%.`);
  }

  if (urlResult && urlResult.riskScore >= 40) {
    reasons.push(`URL analysis flagged ${pageUrl || host} as ${urlResult.threatType}.`);
  }

  return {
    score: clamp(score, 0, 100),
    reasons: Array.from(new Set(reasons)).slice(0, 6),
    brandSignal,
    loginLike
  };
}

function deriveThreatType({ heuristic, urlResult, phishingResult }) {
  const mismatch = heuristic.brandSignal && heuristic.reasons.some((reason) => reason.includes("does not match the expected domain"));

  if (mismatch && heuristic.loginLike) {
    return "Fake Login Page";
  }

  if (mismatch) {
    return "Brand Impersonation";
  }

  if (urlResult && urlResult.riskScore >= 55 && urlResult.threatType !== "None") {
    return urlResult.threatType;
  }

  if (phishingResult && phishingResult.riskScore >= 50) {
    return "Phishing Page";
  }

  if (heuristic.score >= 45) {
    return heuristic.loginLike ? "Suspicious Login Flow" : "Suspicious Page";
  }

  return "None";
}

async function analyzeLiveScreen(payload = {}) {
  const pageSignals = payload.pageSignals || {};
  const pageUrl = String(payload.pageUrl || pageSignals.url || "");
  const title = String(payload.title || pageSignals.title || "");
  const host = normalizeHost(pageUrl);

  let ocrText = "";
  let ocrSource = "none";
  let screenshotAnalyzed = false;
  let ocrError = null;

  if (payload.screenshotBase64) {
    try {
      const ocrResult = await extractTextFromImage(MODEL_REGISTRY.screenOcr, {
        base64: payload.screenshotBase64
      });
      ocrText = normalizeText(ocrResult.text, 4000);
      ocrSource = "huggingface_ocr";
      screenshotAnalyzed = Boolean(ocrText);
    } catch (error) {
      ocrError = error.message;
      ocrSource = "ocr_unavailable";
    }
  }

  const combinedText = normalizeText(
    [
      title,
      pageSignals.metaDescription,
      pageSignals.visibleText,
      ocrText,
      payload.pageText
    ]
      .filter(Boolean)
      .join("\n"),
    10000
  );

  const [phishingResult, urlResult] = await Promise.all([
    detectPhishingMessaging(combinedText),
    pageUrl
      ? detectMaliciousUrl(pageUrl)
      : Promise.resolve({ riskScore: 0, threatType: "None", explanation: "No URL available." })
  ]);

  const heuristic = computeHeuristics({
    host,
    pageUrl,
    title,
    pageSignals,
    ocrText,
    phishingResult,
    urlResult
  });

  const weightedModelScore = Math.round(
    clamp(phishingResult.riskScore * 0.55 + urlResult.riskScore * 0.45, 0, 100)
  );
  const riskScore = clamp(
    Math.max(heuristic.score, weightedModelScore, heuristic.loginLike ? heuristic.score + 6 : heuristic.score),
    0,
    100
  );
  const threatType = deriveThreatType({ heuristic, urlResult, phishingResult });
  const explanation = heuristic.reasons.length
    ? heuristic.reasons.join(" ")
    : "No strong phishing indicators were found on the current screen.";

  return {
    analyzedAt: new Date().toISOString(),
    riskScore,
    threatType: riskScore >= 40 ? threatType : "None",
    isSuspicious: riskScore >= 40,
    explanation,
    brand: heuristic.brandSignal ? heuristic.brandSignal.brand : null,
    actualDomain: host || null,
    expectedDomains: heuristic.brandSignal ? heuristic.brandSignal.expectedDomains : [],
    evidence: heuristic.reasons,
    ocrText,
    screenshotAnalyzed,
    ocrSource,
    ocrModel: MODEL_REGISTRY.screenOcr,
    ocrError,
    models: {
      phishingMessaging: phishingResult.model,
      maliciousUrl: urlResult.model,
      screenOcr: MODEL_REGISTRY.screenOcr
    },
    components: {
      phishingMessaging: phishingResult,
      maliciousUrl: urlResult
    }
  };
}

module.exports = {
  analyzeLiveScreen
};