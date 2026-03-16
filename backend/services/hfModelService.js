const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const HF_API_BASE_URL =
  process.env.HF_API_BASE_URL || "https://router.huggingface.co/hf-inference/models";
const HF_TIMEOUT_MS = Math.max(Number(process.env.HF_TIMEOUT_MS || 60000), 60000);
const HF_INFERENCE_MODE = String(process.env.HF_INFERENCE_MODE || "api").toLowerCase();
const HF_API_RETRIES = Number(process.env.HF_API_RETRIES || 2);
const HF_RETRY_DELAY_MS = Number(process.env.HF_RETRY_DELAY_MS || 2500);
const PYTHON_BIN = process.env.PYTHON_BIN || "python";
const LOCAL_INFER_SCRIPT = path.join(__dirname, "..", "..", "ML", "hf_local", "infer.py");
const LOCAL_MODELS_DIR = path.join(__dirname, "..", "..", "ML", "hf_local", "models");
const LOCAL_CACHE_DIR = path.join(__dirname, "..", "..", "ML", "hf_local", "hf_cache");
const LOCAL_LOCK_FILE = path.join(__dirname, "..", "..", "ML", "hf_local", "models.lock.json");

const MODEL_REGISTRY = {
  phishingMessaging:
    process.env.HF_MODEL_PHISHING_MESSAGING ||
    "facebook/bart-large-mnli",
  maliciousUrl:
    process.env.HF_MODEL_MALICIOUS_URL ||
    "facebook/bart-large-mnli",
  deepfakeImage:
    process.env.HF_MODEL_DEEPFAKE_IMAGE ||
    "prithivMLmods/Deep-Fake-Detector-v2-Model",
  deepfakeAudio:
    process.env.HF_MODEL_DEEPFAKE_AUDIO ||
    "openai/whisper-large-v3",
  deepfakeVideo:
    process.env.HF_MODEL_DEEPFAKE_VIDEO ||
    "MCG-NJU/videomae-base-finetuned-kinetics",
  promptInjection:
    process.env.HF_MODEL_PROMPT_INJECTION ||
    "protectai/deberta-v3-base-prompt-injection",
  anomalyLogs:
    process.env.HF_MODEL_ANOMALY_LOGS ||
    "facebook/bart-large-mnli",
  aiGeneratedText:
    process.env.HF_MODEL_AI_GENERATED_TEXT ||
    "openai-community/roberta-base-openai-detector",
  emailAiGenerated:
    process.env.HF_MODEL_EMAIL_AI_GENERATED ||
    "Hello-SimpleAI/chatgpt-detector-roberta",
  screenOcr:
    process.env.HF_MODEL_SCREEN_OCR ||
    "microsoft/trocr-base-printed"
};

function getApiToken() {
  return process.env.HF_API_TOKEN || process.env.HUGGINGFACE_API_TOKEN || "";
}

function hasHfToken() {
  return Boolean(getApiToken());
}

function shouldUseLocalInference() {
  if (HF_INFERENCE_MODE === "local") return true;
  if (HF_INFERENCE_MODE === "api") return false;
  return !hasHfToken();
}

function getModelRuntime() {
  const usingLocal = shouldUseLocalInference();
  return {
    mode: usingLocal ? "local" : "api",
    configuredMode: HF_INFERENCE_MODE,
    hfTokenConfigured: hasHfToken()
  };
}

function buildUrl(modelId) {
  return `${HF_API_BASE_URL.replace(/\/$/, "")}/${modelId}`;
}

function buildHeaders(contentType = "application/json") {
  const token = getApiToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": contentType
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryHfError(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const code = String(error?.code || "").toUpperCase();
  const message = String(data?.error || error?.message || "").toLowerCase();

  if (code === "ECONNABORTED" || message.includes("timeout")) {
    return true;
  }

  if ([429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  if (message.includes("loading") || message.includes("currently loading")) {
    return true;
  }

  return false;
}

function getRetryDelayMs(error, fallbackDelayMs = HF_RETRY_DELAY_MS) {
  const estimatedSeconds = Number(error?.response?.data?.estimated_time || 0);
  if (estimatedSeconds > 0) {
    return Math.max(Math.round(estimatedSeconds * 1000), fallbackDelayMs);
  }
  return fallbackDelayMs;
}

async function callWithHfRetry(requestFn) {
  let lastError;

  for (let attempt = 0; attempt <= HF_API_RETRIES; attempt += 1) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      const retryable = shouldRetryHfError(error);
      const hasNextAttempt = attempt < HF_API_RETRIES;

      if (!retryable || !hasNextAttempt) {
        throw error;
      }

      const delayMs = getRetryDelayMs(error);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

function getLocalModelPath(modelId) {
  if (!modelId || typeof modelId !== "string") return modelId;

  if (path.isAbsolute(modelId)) {
    return modelId;
  }

  const localPath = path.join(LOCAL_MODELS_DIR, modelId.replace(/\//g, "__"));
  return localPath;
}

function getCachedSnapshotPath(modelId) {
  if (!modelId || typeof modelId !== "string") return null;

  try {
    if (!fs.existsSync(LOCAL_LOCK_FILE)) {
      return null;
    }

    const lock = JSON.parse(fs.readFileSync(LOCAL_LOCK_FILE, "utf-8"));
    const entry = Array.isArray(lock.models)
      ? lock.models.find((item) => item.repo_id === modelId)
      : null;

    if (!entry?.revision) {
      return null;
    }

    const snapshotPath = path.join(
      LOCAL_CACHE_DIR,
      `models--${modelId.replace(/\//g, "--")}`,
      "snapshots",
      entry.revision
    );

    if (fs.existsSync(snapshotPath)) {
      return snapshotPath;
    }
  } catch (_) {
    return null;
  }

  return null;
}

function resolveModelId(modelId) {
  if (!shouldUseLocalInference()) return modelId;

  const localPath = getLocalModelPath(modelId);
  if (localPath && localPath !== modelId) {
    try {
      if (fs.existsSync(localPath)) {
        return localPath;
      }
    } catch (_) {
      return modelId;
    }
  }

  const cachedSnapshotPath = getCachedSnapshotPath(modelId);
  if (cachedSnapshotPath) {
    return cachedSnapshotPath;
  }

  return modelId;
}

function unwrapCandidates(rawData) {
  if (!rawData) return [];

  if (Array.isArray(rawData)) {
    if (rawData.length === 1 && Array.isArray(rawData[0])) {
      return unwrapCandidates(rawData[0]);
    }

    return rawData
      .filter((item) => item && typeof item === "object" && item.label)
      .map((item) => ({
        label: String(item.label),
        score: Number(item.score || 0)
      }))
      .sort((a, b) => b.score - a.score);
  }

  if (typeof rawData === "object") {
    if (rawData.error) {
      throw new Error(String(rawData.error));
    }

    if (Array.isArray(rawData.candidates)) {
      return rawData.candidates
        .filter((item) => item && typeof item === "object" && item.label)
        .map((item) => ({
          label: String(item.label),
          score: Number(item.score || 0)
        }))
        .sort((a, b) => b.score - a.score);
    }

    if (rawData.label) {
      return [
        {
          label: String(rawData.label),
          score: Number(rawData.score || 0)
        }
      ];
    }

    if (Array.isArray(rawData.labels) && Array.isArray(rawData.scores)) {
      return rawData.labels
        .map((label, index) => ({
          label: String(label),
          score: Number(rawData.scores[index] || 0)
        }))
        .sort((a, b) => b.score - a.score);
    }
  }

  return [];
}

function unwrapGeneratedText(rawData) {
  if (!rawData) return "";

  if (typeof rawData === "string") {
    return rawData.trim();
  }

  if (Array.isArray(rawData)) {
    const parts = rawData
      .map((item) => unwrapGeneratedText(item))
      .filter(Boolean);
    return parts.join(" ").trim();
  }

  if (typeof rawData === "object") {
    if (rawData.error) {
      throw new Error(String(rawData.error));
    }

    if (typeof rawData.generated_text === "string") {
      return rawData.generated_text.trim();
    }

    if (Array.isArray(rawData.generated_text)) {
      return rawData.generated_text.map((item) => String(item || "")).join(" ").trim();
    }

    if (Array.isArray(rawData.text)) {
      return rawData.text.map((item) => String(item || "")).join(" ").trim();
    }

    if (typeof rawData.text === "string") {
      return rawData.text.trim();
    }

    if (rawData.raw) {
      return unwrapGeneratedText(rawData.raw);
    }
  }

  return "";
}

async function postJsonModel(modelId, payload) {
  const response = await callWithHfRetry(() =>
    axios.post(buildUrl(modelId), payload, {
      headers: buildHeaders("application/json"),
      timeout: HF_TIMEOUT_MS
    })
  );
  return response.data;
}

async function postBinaryModel(modelId, content, contentType) {
  const response = await callWithHfRetry(() =>
    axios.post(buildUrl(modelId), content, {
      headers: buildHeaders(contentType || "application/octet-stream"),
      timeout: HF_TIMEOUT_MS
    })
  );
  return response.data;
}

function decodeBase64Payload(base64String) {
  if (!base64String) return { buffer: null, contentType: null };

  const dataUriMatch = base64String.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUriMatch) {
    return {
      contentType: dataUriMatch[1],
      buffer: Buffer.from(dataUriMatch[2], "base64")
    };
  }

  return {
    contentType: null,
    buffer: Buffer.from(base64String, "base64")
  };
}

async function readMediaInput(mediaInput) {
  if (!mediaInput) {
    throw new Error("Media input is required.");
  }

  if (Buffer.isBuffer(mediaInput)) {
    return {
      buffer: mediaInput,
      contentType: "application/octet-stream"
    };
  }

  if (typeof mediaInput === "string") {
    if (/^https?:\/\//i.test(mediaInput)) {
      const response = await axios.get(mediaInput, {
        responseType: "arraybuffer",
        timeout: HF_TIMEOUT_MS
      });
      return {
        buffer: Buffer.from(response.data),
        contentType: response.headers["content-type"] || "application/octet-stream"
      };
    }

    const parsed = decodeBase64Payload(mediaInput);
    if (!parsed.buffer) throw new Error("Invalid media input.");
    return {
      buffer: parsed.buffer,
      contentType: parsed.contentType || "application/octet-stream"
    };
  }

  if (typeof mediaInput === "object") {
    if (mediaInput.url) {
      const response = await axios.get(mediaInput.url, {
        responseType: "arraybuffer",
        timeout: HF_TIMEOUT_MS
      });
      return {
        buffer: Buffer.from(response.data),
        contentType:
          mediaInput.contentType ||
          response.headers["content-type"] ||
          "application/octet-stream"
      };
    }

    if (mediaInput.base64) {
      const parsed = decodeBase64Payload(mediaInput.base64);
      return {
        buffer: parsed.buffer,
        contentType:
          mediaInput.contentType || parsed.contentType || "application/octet-stream"
      };
    }
  }

  throw new Error("Unsupported media input format.");
}

function resolveLocalSource(mediaInput) {
  if (!mediaInput) throw new Error("Media input is required.");

  if (typeof mediaInput === "string") {
    return mediaInput;
  }

  if (typeof mediaInput === "object") {
    if (mediaInput.path) return mediaInput.path;
    if (mediaInput.url) return mediaInput.url;
    if (mediaInput.base64) return mediaInput.base64;
  }

  throw new Error("Unsupported local media input format.");
}

async function runLocalInference(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [LOCAL_INFER_SCRIPT], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(stderr.trim() || `Local inference exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim() || "{}");
        if (!parsed.ok) {
          reject(new Error(parsed.error || "Local model inference failed."));
          return;
        }
        resolve(parsed);
      } catch (error) {
        reject(
          new Error(
            `Could not parse local inference response. ${error.message}. stderr: ${stderr.trim()}`
          )
        );
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

async function classifyText(modelId, text, parameters = {}) {
  if (!text || typeof text !== "string") {
    throw new Error("Text input is required for model classification.");
  }

  let raw;
  const resolvedModelId = resolveModelId(modelId);

  if (shouldUseLocalInference()) {
    raw = await runLocalInference({
      model: resolvedModelId,
      inputType: "text",
      text: text.slice(0, 4000),
      parameters
    });
  } else {
    raw = await postJsonModel(modelId, {
      inputs: text,
      options: {
        wait_for_model: true,
        use_cache: true
      },
      parameters
    });
  }

  const candidates = unwrapCandidates(raw);
  const top = candidates[0] || { label: "unknown", score: 0 };

  return {
    model: resolvedModelId,
    label: top.label,
    score: Number(top.score || 0),
    candidates,
    raw
  };
}

async function classifyMedia(modelId, mediaInput, fallbackContentType) {
  let raw;
  const resolvedModelId = resolveModelId(modelId);

  if (shouldUseLocalInference()) {
    const source = resolveLocalSource(mediaInput);
    const contentType = String(fallbackContentType || "").toLowerCase();
    let inputType = "image";

    if (contentType.startsWith("audio/")) {
      inputType = "audio";
    } else if (contentType.startsWith("video/")) {
      inputType = "video";
    }

    raw = await runLocalInference({
      model: resolvedModelId,
      inputType,
      source
    });
  } else {
    const media = await readMediaInput(mediaInput);
    raw = await postBinaryModel(
      modelId,
      media.buffer,
      media.contentType || fallbackContentType || "application/octet-stream"
    );
  }

  const candidates = unwrapCandidates(raw);
  const top = candidates[0] || { label: "unknown", score: 0 };

  return {
    model: resolvedModelId,
    label: top.label,
    score: Number(top.score || 0),
    candidates,
    raw
  };
}

async function extractTextFromImage(modelId, mediaInput) {
  let raw;
  const resolvedModelId = resolveModelId(modelId);

  if (shouldUseLocalInference()) {
    const source = resolveLocalSource(mediaInput);
    raw = await runLocalInference({
      model: resolvedModelId,
      inputType: "image_to_text",
      source
    });
  } else {
    const media = await readMediaInput(mediaInput);
    raw = await postBinaryModel(
      modelId,
      media.buffer,
      media.contentType || "image/jpeg"
    );
  }

  const text = unwrapGeneratedText(raw);

  return {
    model: resolvedModelId,
    text,
    raw
  };
}

module.exports = {
  MODEL_REGISTRY,
  hasHfToken,
  getModelRuntime,
  classifyText,
  classifyMedia,
  extractTextFromImage
};
