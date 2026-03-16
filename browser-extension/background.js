const VIDEO_CONTEXT_MENU_ID = "threat-lens-analyze-video";
const DEFAULT_BACKEND_URL = "http://localhost:8000";
const VIDEO_ANALYZE_PATH = "/api/threats/video-ai-likelihood";
const REQUEST_TIMEOUT_MS = 45000;

async function setupContextMenus() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: VIDEO_CONTEXT_MENU_ID,
    title: "Analyze Video for AI Content",
    contexts: ["video"]
  });
}

function normalizeBackendUrl(url) {
  const clean = String(url || "").trim() || DEFAULT_BACKEND_URL;
  return clean.endsWith("/") ? clean.slice(0, -1) : clean;
}

async function readBackendUrl() {
  const stored = await chrome.storage.local.get(["backendUrl"]);
  return normalizeBackendUrl(stored.backendUrl);
}

function withTimeout(fetchPromise, timeoutMs = REQUEST_TIMEOUT_MS) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Backend request timed out.")), timeoutMs);
  });

  return Promise.race([fetchPromise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

function formatVideoResultMessage(result = {}) {
  const score = Number(result.aiLikelihoodScore || 0);
  const percent = `${Math.max(0, Math.min(100, Math.round(score)))}%`;
  const label = result.classification || "Unknown";
  const confidence = Number(result.modelConfidence || 0);
  const confidencePercent = `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}%`;
  const model = result.model || "HF video model";

  return [
    "Threat Lens Video Analysis",
    `AI likelihood: ${percent}`,
    `Classification: ${label}`,
    `Model confidence: ${confidencePercent}`,
    `Model: ${model}`,
    result.explanation ? `Details: ${result.explanation}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

async function analyzeVideoFromContext(info, tab) {
  const videoUrl = info?.srcUrl;

  if (!videoUrl || (!/^https?:\/\//i.test(videoUrl) && !/^data:/i.test(videoUrl))) {
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "VIDEO_ANALYSIS_RESULT",
        ok: false,
        error: "This video source cannot be analyzed (unsupported URL format)."
      });
    }
    return;
  }

  try {
    const backendUrl = await readBackendUrl();
    const response = await withTimeout(
      fetch(`${backendUrl}${VIDEO_ANALYZE_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          videoUrl,
          pageUrl: tab?.url || info?.pageUrl || null
        })
      })
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || `Backend error ${response.status}.`);
    }

    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "VIDEO_ANALYSIS_RESULT",
        ok: true,
        message: formatVideoResultMessage(payload),
        data: payload
      });
    }
  } catch (error) {
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "VIDEO_ANALYSIS_RESULT",
        ok: false,
        error: error?.message || "Could not analyze the selected video."
      });
    }
  }
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenus().catch((error) => {
    console.error("[Threat Lens] Failed to set up context menu", error);
  });
  console.log("[Threat Lens] Background service worker ready.");
});

chrome.runtime.onStartup.addListener(() => {
  setupContextMenus().catch((error) => {
    console.error("[Threat Lens] Failed to restore context menu", error);
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info?.menuItemId !== VIDEO_CONTEXT_MENU_ID) {
    return;
  }

  analyzeVideoFromContext(info, tab).catch((error) => {
    console.error("[Threat Lens] Video analysis failed", error);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "PAGE_DATA") {
    return false;
  }

  const payload = {
    data: message.data || null,
    tabId: sender?.tab?.id || null,
    url: sender?.tab?.url || null,
    updatedAt: new Date().toISOString()
  };

  chrome.storage.local.set({ latestPageData: payload }, () => {
    sendResponse({ ok: true });
  });

  return true;
});