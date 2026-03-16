const DEFAULT_BACKEND_URL = "http://localhost:8000";
const LIVE_SCREEN_ANALYZE_PATH = "/api/threats/live-screen-analyze";
const LIVE_SCAN_INTERVAL_MS = 8000;
const REQUEST_TIMEOUT_MS = 20000;
const SUSPICIOUS_KEYWORDS = [
  "login",
  "sign in",
  "signin",
  "verify",
  "account",
  "password",
  "otp",
  "2fa",
  "bank",
  "secure",
  "suspended",
  "confirm"
];
const SUSPICIOUS_LINK_PATTERNS = [
  /login/i,
  /verify/i,
  /account/i,
  /secure/i,
  /update/i,
  /password/i,
  /signin/i,
  /session/i,
  /redirect/i,
  /%40/i,
  /@/,
  /bit\.ly/i,
  /tinyurl/i
];

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

    const rawPageSignals = await extractPageSignals(tab.id);
    const pageSignals = normalizeSignalsForBackend(rawPageSignals);
    let screenshotDataUrl = null;

    if (options.captureScreenshot && typeof tab.windowId === "number") {
      screenshotDataUrl = await tryCapturePreview(tab.windowId);
    }

    setBusyState(true, screenshotDataUrl ? "Running OCR and phishing checks..." : "Analyzing page signals...");
    const backendUrl = normalizeBackendUrl(backendUrlInput.value);

    const response = await fetchWithTimeout(`${backendUrl}${LIVE_SCREEN_ANALYZE_PATH}`, {
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

    const payload = await safeReadResponse(response);
    if (!response.ok) {
      throw new Error(buildBackendErrorMessage(response, payload));
    }

    renderResult(pageSignals, payload);
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

function normalizeText(value, max = 6000) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countKeywordHits(text) {
  const haystack = normalizeText(text, 12000).toLowerCase();

  return SUSPICIOUS_KEYWORDS.reduce((count, keyword) => {
    const matches = haystack.match(new RegExp(`\\b${escapeRegExp(keyword.toLowerCase())}\\b`, "g"));
    return count + (matches ? matches.length : 0);
  }, 0);
}

function getFormDetails(pageSignals = {}) {
  if (Array.isArray(pageSignals.formDetails)) {
    return pageSignals.formDetails;
  }

  if (Array.isArray(pageSignals.forms)) {
    return pageSignals.forms;
  }

  return [];
}

function normalizeSignalsForBackend(pageSignals = {}) {
  const formDetails = getFormDetails(pageSignals);
  const visibleText = normalizeText(pageSignals.visibleText || pageSignals.pageText || "", 8000);
  const metaDescription = normalizeText(pageSignals.metaDescription || "", 500);
  const links = Array.isArray(pageSignals.links)
    ? pageSignals.links.filter((link) => typeof link === "string" && link.trim())
    : [];
  const linkCount = Number.isFinite(Number(pageSignals.linkCount))
    ? Number(pageSignals.linkCount)
    : links.length;
  const externalLinkCount = Number.isFinite(Number(pageSignals.externalLinkCount))
    ? Number(pageSignals.externalLinkCount)
    : links.filter((link) => {
        try {
          return new URL(link, pageSignals.url || window.location.href).hostname !== (pageSignals.domain || window.location.hostname);
        } catch (_error) {
          return false;
        }
      }).length;
  const suspiciousLinkCount = Number.isFinite(Number(pageSignals.suspiciousLinkCount))
    ? Number(pageSignals.suspiciousLinkCount)
    : links.filter((link) => SUSPICIOUS_LINK_PATTERNS.some((pattern) => pattern.test(link))).length;
  const passwordFields = Number.isFinite(Number(pageSignals.passwordFields))
    ? Number(pageSignals.passwordFields)
    : pageSignals.hasPasswordField
      ? 1
      : formDetails.reduce((count, form) => {
          const inputs = Array.isArray(form?.inputs) ? form.inputs : [];
          return count + inputs.filter((input) => String(input?.type || "").toLowerCase() === "password").length;
        }, 0);
  const suspiciousKeywordHits = Number.isFinite(Number(pageSignals.suspiciousKeywordHits))
    ? Number(pageSignals.suspiciousKeywordHits)
    : countKeywordHits([pageSignals.title, metaDescription, visibleText].filter(Boolean).join(" "));
  const hasLoginForm = Boolean(pageSignals.hasLoginForm) || passwordFields > 0 || suspiciousKeywordHits > 0;

  return {
    ...pageSignals,
    url: pageSignals.url || window.location.href,
    domain: pageSignals.domain || window.location.hostname,
    title: pageSignals.title || document.title || "",
    forms: formDetails.length,
    formDetails,
    visibleText,
    pageText: visibleText,
    metaDescription,
    links,
    linkCount,
    externalLinkCount,
    suspiciousLinkCount,
    suspiciousKeywordHits,
    passwordFields,
    hasPasswordField: passwordFields > 0,
    hasLoginForm
  };
}

function buildInputPayload(pageSignals = {}) {
  const formDetails = getFormDetails(pageSignals);
  const formSummary = formDetails
    .map((form) => {
      const action = String(form?.action || "");
      const method = String(form?.method || "get").toUpperCase();
      const fields = Array.isArray(form?.inputs)
        ? form.inputs.map((input) => `${input?.type || "field"}:${input?.name || "unnamed"}`).join(", ")
        : "";

      return [action, method, fields].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join(" | ");

  return [
    pageSignals.title,
    pageSignals.url,
    pageSignals.domain,
    pageSignals.metaDescription,
    pageSignals.visibleText || pageSignals.pageText,
    formSummary,
    Array.isArray(pageSignals.links) ? pageSignals.links.join(" ") : ""
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 12000);
}

function getFormCount(pageSignals = {}) {
  if (Array.isArray(pageSignals.formDetails)) {
    return pageSignals.formDetails.length;
  }

  if (Array.isArray(pageSignals.forms)) {
    return pageSignals.forms.length;
  }

  return Number(pageSignals.forms || 0);
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
      `Forms detected: ${getFormCount(pageSignals)}`,
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

  threatType.textContent = derivedThreatType || "None";
  explanation.textContent = derivedExplanation || "No explanation available.";
  recommendation.textContent = derivedRecommendation || "No recommendation available.";
  detectedBrand.textContent = backendData.brand || "None detected";
  actualDomain.textContent = backendData.actualDomain || pageSignals.domain || "Unknown";
  ocrText.textContent = backendData.ocrText || "No OCR text extracted from the screenshot.";

  evidenceList.innerHTML = "";
  const evidence = Array.isArray(backendData.evidence) ? backendData.evidence : [];
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
  const metaDescription = normalizeText(document.querySelector('meta[name="description"]')?.content || "");
  const forms = Array.from(document.querySelectorAll("form")).map((formElement) => ({
    action: normalizeText(formElement.getAttribute("action")) || window.location.href,
    method: (normalizeText(formElement.getAttribute("method")) || "get").toLowerCase(),
    inputs: Array.from(formElement.querySelectorAll("input, select, textarea")).map((field) => ({
      type: normalizeText(field.getAttribute("type")) || field.tagName.toLowerCase(),
      name: normalizeText(field.getAttribute("name")) || normalizeText(field.getAttribute("id"))
    }))
  }));
  const links = Array.from(document.querySelectorAll("a[href]"))
    .map((anchor) => anchor.href)
    .filter(Boolean)
    .slice(0, 250);
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
    metaDescription,
    visibleText: pageText,
    forms,
    formDetails: forms,
    passwordFields: hasPasswordField ? 1 : 0,
    hasPasswordField,
    hasLoginForm,
    pageText,
    links,
    linkCount: links.length
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

async function safeReadResponse(response) {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      return await response.json();
    }

    const text = await response.text();
    return {
      rawText: text
    };
  } catch (error) {
    return {};
  }
}

function truncateText(value, max = 220) {
  const normalized = normalizeText(String(value || ""), max + 1);
  if (normalized.length <= max) {
    return normalized;
  }

  return `${normalized.slice(0, max - 1)}...`;
}

function buildBackendErrorMessage(response, payload = {}) {
  if (payload && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }

  if (response.status === 404) {
    return "Backend route /api/threats/live-screen-analyze was not found. Restart the backend and reload the extension.";
  }

  if (response.status === 413) {
    return "Screenshot payload was too large for the backend to accept.";
  }

  if (payload && typeof payload.rawText === "string" && payload.rawText.trim()) {
    return `Backend error ${response.status}: ${truncateText(payload.rawText)}`;
  }

  return `Backend error ${response.status}.`;
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
