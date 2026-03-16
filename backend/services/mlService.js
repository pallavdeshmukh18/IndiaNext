const { analyzeEmail } = require("./mlBridge");
const { analyzeUrl } = require("./urlBridge");

const URL_REGEX = /\bhttps?:\/\/[^\s<>"')\]]+/gi;

function collectCandidateUrls(input, pageUrl) {
  const urls = new Set();

  for (const match of input.match(URL_REGEX) || []) {
    urls.add(match);
  }

  if (typeof pageUrl === "string" && /^https?:\/\//i.test(pageUrl)) {
    urls.add(pageUrl);
  }

  return Array.from(urls);
}

async function scoreUrls(candidateUrls) {
  const urlResults = [];

  for (const url of candidateUrls) {
    try {
      const result = await analyzeUrl(url);
      urlResults.push({ url, ...result });
    } catch (error) {
      urlResults.push({
        url,
        isSuspicious: true,
        riskScore: 60,
        threatType: "Suspicious URL",
        explanation: `URL analysis failed for ${url}: ${error.message}`,
      });
    }
  }

  urlResults.sort((left, right) => right.riskScore - left.riskScore);
  return urlResults;
}

async function detectThreat(input, options = {}) {
  const safeInput = typeof input === "string" ? input : "";
  console.log(`Analyzing input: ${safeInput.substring(0, 50)}...`);

  const lowerInput = safeInput.toLowerCase();
  const phishingKeywords = [
    "password",
    "urgent",
    "account suspended",
    "click here",
    "verify your account",
    "login",
    "bank",
  ];
  const promptInjectionKeywords = [
    "ignore previous instructions",
    "system prompt",
    "bypass",
    "jailbreak",
    "you are now",
  ];

  let riskScore = 10;
  const explanations = [];
  let threatType = "Safe";

  let phishingHits = 0;
  for (const keyword of phishingKeywords) {
    if (lowerInput.includes(keyword)) {
      phishingHits++;
      riskScore += 15;
      explanations.push(`Found keyword associated with phishing: "${keyword}"`);
    }
  }

  if (phishingHits > 2) {
    threatType = "Phishing";
  }

  const candidateUrls = collectCandidateUrls(safeInput, options.pageUrl);
  if (candidateUrls.length > 0) {
    const urlResults = await scoreUrls(candidateUrls);
    const topUrlResult = urlResults[0];

    riskScore = Math.max(riskScore, topUrlResult.riskScore);
    explanations.push(`URL assessment for ${topUrlResult.url}: ${topUrlResult.explanation}`);

    if (topUrlResult.isSuspicious) {
      threatType = topUrlResult.threatType;
    } else if (threatType === "Safe") {
      explanations.push("Detected URL appears clean based on SentinEL model patterns.");
    }
  }

  let injectionHits = 0;
  for (const keyword of promptInjectionKeywords) {
    if (lowerInput.includes(keyword)) {
      injectionHits++;
      riskScore += 30;
      explanations.push(`Found language attempting to override system instructions: "${keyword}"`);
    }
  }

  if (injectionHits > 0) {
    threatType = "Prompt Injection";
  }

  riskScore = Math.min(riskScore, 100);

  const isSuspicious = riskScore > 40;
  if (explanations.length === 0 && isSuspicious) {
    explanations.push("Anomalous pattern detected by baseline heuristic model.");
  }

  if (explanations.length === 0 && !isSuspicious) {
    explanations.push("No obvious malicious patterns found in the input.");
  }

  return {
    isSuspicious,
    riskScore,
    threatType: isSuspicious ? threatType : "None",
    explanation: explanations.join(" "),
  };
}

module.exports = {
  analyzeEmail,
  detectThreat,
};
