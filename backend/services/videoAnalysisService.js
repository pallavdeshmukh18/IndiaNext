const { MODEL_REGISTRY, classifyMedia } = require("./hfModelService");

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

function normalizeLabel(value) {
  return String(value || "").trim().toLowerCase();
}

function isLikelySyntheticLabel(label) {
  const normalized = normalizeLabel(label);
  if (!normalized) return false;

  const syntheticHints = [
    "ai",
    "generated",
    "deepfake",
    "synthetic",
    "face swap",
    "faceswap",
    "computer generated",
    "cgi",
    "animation",
    "cartoon",
    "avatar"
  ];

  return syntheticHints.some((hint) => normalized.includes(hint));
}

function computeAiLikelihood(prediction = {}) {
  const candidates = Array.isArray(prediction.candidates) ? prediction.candidates : [];

  const topSynthetic = candidates
    .filter((candidate) => isLikelySyntheticLabel(candidate?.label))
    .sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0))[0];

  if (topSynthetic) {
    return {
      classification: "Likely AI-Generated",
      aiLikelihoodScore: clamp(Math.round(Number(topSynthetic.score || 0) * 100), 0, 100),
      triggerLabel: String(topSynthetic.label || "synthetic"),
      modelConfidence: clamp(Number(topSynthetic.score || 0), 0, 1)
    };
  }

  const top = candidates[0] || { label: prediction.label || "unknown", score: prediction.score || 0 };
  const topScore = clamp(Number(top.score || 0), 0, 1);
  const aiScore = Math.round((1 - topScore) * 35);

  return {
    classification: aiScore >= 20 ? "Possibly AI-Generated" : "Likely Real",
    aiLikelihoodScore: clamp(aiScore, 0, 100),
    triggerLabel: String(top.label || "unknown"),
    modelConfidence: topScore
  };
}

async function analyzeVideoAiLikelihood({ videoUrl, videoBase64, pageUrl }) {
  const mediaInput = videoUrl || videoBase64;

  if (!mediaInput) {
    throw new Error("videoUrl or videoBase64 is required.");
  }

  const prediction = await classifyMedia(
    MODEL_REGISTRY.deepfakeVideo,
    mediaInput,
    "video/mp4"
  );

  const likelihood = computeAiLikelihood(prediction);
  const topCandidates = summarizeCandidates(prediction.candidates);
  const indicators = [];

  if (/deepfake|synthetic|generated|ai/i.test(String(likelihood.triggerLabel || ""))) {
    indicators.push(`Synthetic-media label detected: ${likelihood.triggerLabel}`);
  }

  if (topCandidates.length) {
    indicators.push(`Top model output confidence ${topCandidates[0].confidencePercent}%`);
  }

  const explanation = [
    `Top model label: ${likelihood.triggerLabel}.`,
    `Computed AI-likelihood score: ${likelihood.aiLikelihoodScore}/100.`,
    topCandidates.length
      ? `Top candidates: ${topCandidates.map((candidate) => `${candidate.label} (${candidate.confidencePercent}%)`).join(", ")}.`
      : null
  ]
    .filter(Boolean)
    .join(" ");

  return {
    aiLikelihoodScore: likelihood.aiLikelihoodScore,
    classification: likelihood.classification,
    modelConfidence: likelihood.modelConfidence,
    model: prediction.model,
    pageUrl: pageUrl || null,
    sourceVideo: videoUrl || "base64_payload",
    label: prediction.label,
    explanation,
    indicators,
    explainability: {
      summary: explanation,
      classification: likelihood.classification,
      aiLikelihoodScore: likelihood.aiLikelihoodScore,
      modelConfidencePercent: Number((likelihood.modelConfidence * 100).toFixed(1)),
      triggerLabel: likelihood.triggerLabel,
      indicators,
      topCandidates
    },
    candidates: prediction.candidates.slice(0, 5),
    analyzedAt: new Date().toISOString()
  };
}

module.exports = {
  analyzeVideoAiLikelihood
};
