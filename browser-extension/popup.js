const DEFAULT_BACKEND_URL = "http://localhost:8000";
const LIVE_SCREEN_ANALYZE_PATH = "/api/threats/live-screen-analyze";
const LIVE_SCAN_INTERVAL_MS = 8000;
const REQUEST_TIMEOUT_MS = 10000;

const backendUrlInput = document.getElementById("backendUrl");
const analyzeBtn = document.getElementById("analyzeBtn");
const liveModeToggle = document.getElementById("liveModeToggle");
const statusText = document.getElementById("statusText");
const lastAnalyzed = document.getElementById("lastAnalyzed");
const errorText = document.getElementById("errorText");

const previewCard = document.getElementById("previewCard");
const screenshotPreview = document.getElementById("screenshotPreview");

const resultCard = document.getElementById("resultCard");
const riskScore = document.getElementById("riskScore");
const riskBadge = document.getElementById("riskBadge");
const meterFill = document.getElementById("meterFill");
const threatType = document.getElementById("threatType");
const explanation = document.getElementById("explanation");
const recommendation = document.getElementById("recommendation");
const detectedBrand = document.getElementById("detectedBrand");
const actualDomain = document.getElementById("actualDomain");
const evidenceList = document.getElementById("evidenceList");
const ocrText = document.getElementById("ocrText");

let liveScanTimer = null;
let isAnalyzing = false;

init();

async function init() {
  const settings = await readStoredSettings();
  backendUrlInput.value = settings.backendUrl;
  liveModeToggle.checked = Boolean(settings.liveMode);

  analyzeBtn.addEventListener("click", () => runAnalysis({ captureScreenshot: true }));
  backendUrlInput.addEventListener("change", saveBackendUrl);
  liveModeToggle.addEventListener("change", onLiveModeToggle);

  if (liveModeToggle.checked) {
    startLiveMonitoring();
  }

  runAnalysis({ captureScreenshot: true });
}

async function runAnalysis(options = {}) {
  if (isAnalyzing) return;

  clearError();
  setBusyState(true, "Reading current screen...");
  isAnalyzing = true;

  try {
    const tab = await getActiveTab();
    if (!tab || typeof tab.id !== "number") {
      throw new Error("No active tab found.");
    }

    const pageSignals = await extractPageSignals(tab.id);
    let screenshotDataUrl = null;

    if (options.captureScreenshot && typeof tab.windowId === "number") {
      screenshotDataUrl = await tryCapturePreview(tab.windowId);
    }

    setBusyState(true, screenshotDataUrl ? "Running OCR and phishing checks..." : "Analyzing page signals...");
    const backendUrl = normalizeBackendUrl(backendUrlInput.value);

    const response = await fetch(`${backendUrl}${LIVE_SCREEN_ANALYZE_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        pageText: buildInputPayload(pageSignals),
        inputType: "web_snapshot",
        pageUrl: pageSignals.url,
        title: pageSignals.title,
        pageSignals,
        screenshotBase64: screenshotDataUrl
      })
    });

    const data = await safeReadJson(response);
    if (!response.ok) {
      throw new Error(data.error || "Analysis failed.");
    }

    renderResult(pageSignals, data);
    updateLastAnalyzed(new Date().toISOString());
    setBusyState(false, "Page signals sent to backend.");
  } catch (error) {
    showError(error.message || "Unexpected error while analyzing page.");
    setBusyState(false, "Unable to send page signals.");
  } finally {
    isAnalyzing = false;
  }
}

function onLiveModeToggle() {
  const enabled = liveModeToggle.checked;
  saveLiveMode(enabled);

  if (enabled) {
    startLiveMonitoring();
    runAnalysis({ captureScreenshot: true });
  } else {
    stopLiveMonitoring();
    statusText.textContent = "Live monitor paused.";
  }
}

function startLiveMonitoring() {
  stopLiveMonitoring();
  liveScanTimer = setInterval(() => {
    runAnalysis({ captureScreenshot: true });
  }, LIVE_SCAN_INTERVAL_MS);
}

function stopLiveMonitoring() {
  if (liveScanTimer) {
    clearInterval(liveScanTimer);
    liveScanTimer = null;
  }
}

function renderResult(pageSignals, backendData) {
  const backendScore = Number(
    backendData.riskScore ??
      backendData.risk_score ??
      backendData.overallRiskScore ??
      0
  );
  const score = clampNumber(backendScore, 0, 100);
  const derivedThreatType =
    backendData.threatType ||
    backendData.label ||
    (pageSignals.hasLoginForm ? "Login Surface Detected" : "No Immediate Login Signals");
  const derivedExplanation =
    backendData.explanation ||
    backendData.summary ||
    [
      `Domain: ${pageSignals.domain || "unknown"}`,
      `Forms detected: ${pageSignals.forms.length}`,
      `Password field present: ${pageSignals.hasPasswordField ? "Yes" : "No"}`,
      `Login form heuristic: ${pageSignals.hasLoginForm ? "Triggered" : "Not triggered"}`
    ].join(" | ");
  const derivedRecommendation =
    backendData.recommendation ||
    "DOM signals have been forwarded to Scamurai backend. // TODO: call phishing ML service";

  let badgeText = "SAFE";
  let badgeClass = "safe";

  if (score >= 75) {
    badgeText = "HIGH THREAT";
    badgeClass = "high";
  } else if (score >= 40) {
    badgeText = "MEDIUM THREAT";
    badgeClass = "medium";
  }

  riskScore.textContent = `${score}%`;
  meterFill.style.width = `${score}%`;

  riskBadge.className = "risk-badge";
  riskBadge.classList.add(badgeClass);
  riskBadge.textContent = badgeText;

  threatType.textContent = data.threatType || "None";
  explanation.textContent = data.explanation || "No explanation available.";
  recommendation.textContent = data.recommendation || "No recommendation available.";
  detectedBrand.textContent = data.brand || "None detected";
  actualDomain.textContent = data.actualDomain || "Unknown";
  ocrText.textContent = data.ocrText || "No OCR text extracted from the screenshot.";

  evidenceList.innerHTML = "";
  const evidence = Array.isArray(data.evidence) ? data.evidence : [];
  if (evidence.length) {
    for (const item of evidence) {
      const li = document.createElement("li");
      li.textContent = item;
      evidenceList.appendChild(li);
    }
  } else {
    const li = document.createElement("li");
    li.textContent = "No strong phishing evidence found in the current screen.";
    evidenceList.appendChild(li);
  }

  resultCard.classList.remove("hidden");
}

async function extractPageSignals(tabId) {
  try {
    return await requestSignalsFromContentScript(tabId);
  } catch (error) {
    return requestSignalsViaScriptInjection(tabId);
  }
}

async function requestSignalsFromContentScript(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: "GET_SCREEN_SIGNALS" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response) {
        reject(new Error("No response from page."));
        return;
      }

      if (!response.ok) {
        reject(new Error(response.error || "Could not read page signals."));
        return;
      }

      resolve(response.signals);
    });
  });
}

async function requestSignalsViaScriptInjection(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: collectPageSignalsInPageContext
      },
      (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!results || !results[0] || !results[0].result) {
          reject(new Error("Could not read page contents."));
          return;
        }

        resolve(results[0].result);
      }
    );
  });
}

function collectPageSignalsInPageContext() {
  const normalizeText = (value) =>
    typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  const pageText = normalizeText(document.body?.innerText || "").slice(0, 5000);
  const forms = Array.from(document.querySelectorAll("form")).map((formElement) => ({
    action: normalizeText(formElement.getAttribute("action")) || window.location.href,
    method: (normalizeText(formElement.getAttribute("method")) || "get").toLowerCase(),
    inputs: Array.from(formElement.querySelectorAll("input, select, textarea")).map((field) => ({
      type: normalizeText(field.getAttribute("type")) || field.tagName.toLowerCase(),
      name: normalizeText(field.getAttribute("name")) || normalizeText(field.getAttribute("id"))
    }))
  }));
  const hasPasswordField = Boolean(document.querySelector("input[type='password']"));
  const hasLoginForm =
    hasPasswordField ||
    ["login", "signin", "account", "password", "verify"].some((keyword) =>
      pageText.toLowerCase().includes(keyword)
    );

  return {
    url: window.location.href,
    domain: window.location.hostname,
    title: document.title || "",
    forms,
    hasPasswordField,
    hasLoginForm,
    pageText
  };
}

async function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(tabs[0]);
    });
  });
}

async function tryCapturePreview(windowId) {
  try {
    const rawScreenshot = await captureVisibleTab(windowId);
    const screenshotDataUrl = await optimizeScreenshot(rawScreenshot);
    screenshotPreview.src = screenshotDataUrl;
    previewCard.classList.remove("hidden");
    return screenshotDataUrl;
  } catch (error) {
    // Keep scan results available even if screenshot capture is blocked on this tab.
    return null;
  }
}

async function captureVisibleTab(windowId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 65 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!dataUrl) {
        reject(new Error("Screenshot capture failed."));
        return;
      }
      resolve(dataUrl);
    });
  });
}

async function optimizeScreenshot(dataUrl) {
  const image = await loadImage(dataUrl);
  const maxWidth = 1440;
  const scale = image.width > maxWidth ? maxWidth / image.width : 1;
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", 0.72);
}

async function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not process screenshot."));
    image.src = dataUrl;
  });
}

async function readStoredSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["backendUrl", "liveMode"], (result) => {
      resolve({
        backendUrl: normalizeBackendUrl(result.backendUrl || DEFAULT_BACKEND_URL),
        liveMode: Boolean(result.liveMode)
      });
    });
  });
}

async function saveBackendUrl() {
  const backendUrl = normalizeBackendUrl(backendUrlInput.value);
  backendUrlInput.value = backendUrl;

  return new Promise((resolve) => {
    chrome.storage.local.set({ backendUrl }, () => resolve());
  });
}

async function saveLiveMode(enabled) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ liveMode: Boolean(enabled) }, () => resolve());
  });
}

function normalizeBackendUrl(url) {
  const clean = (url || "").trim() || DEFAULT_BACKEND_URL;
  return clean.endsWith("/") ? clean.slice(0, -1) : clean;
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Backend request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function updateLastAnalyzed(isoTime) {
  const parsed = new Date(isoTime);
  const timestamp = Number.isNaN(parsed.getTime())
    ? new Date().toLocaleTimeString()
    : parsed.toLocaleTimeString();

  lastAnalyzed.textContent = `Last analyzed: ${timestamp}`;
  lastAnalyzed.classList.remove("hidden");
}

function clampNumber(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function setBusyState(isBusy, text) {
  analyzeBtn.disabled = isBusy;
  statusText.textContent = text;
}

function clearError() {
  errorText.classList.add("hidden");
  errorText.textContent = "";
}

function showError(message) {
  errorText.textContent = message;
  errorText.classList.remove("hidden");
}
