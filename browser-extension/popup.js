const DEFAULT_BACKEND_URL = "http://localhost:8000";
const QUICK_ANALYZE_PATH = "/api/threats/quick-analyze";

const backendUrlInput = document.getElementById("backendUrl");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusText = document.getElementById("statusText");
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

init();

async function init() {
  const backendUrl = await readStoredBackendUrl();
  backendUrlInput.value = backendUrl;

  analyzeBtn.addEventListener("click", runAnalysis);
  backendUrlInput.addEventListener("change", saveBackendUrl);
}

async function runAnalysis() {
  clearError();
  setBusyState(true, "Capturing screenshot...");

  try {
    const tab = await getActiveTab();
    if (!tab || typeof tab.windowId !== "number") {
      throw new Error("No active tab found.");
    }

    const screenshotDataUrl = await captureVisibleTab(tab.windowId);
    screenshotPreview.src = screenshotDataUrl;
    previewCard.classList.remove("hidden");

    setBusyState(true, "Extracting page text...");
    const pageSignals = await extractPageSignals(tab.id);

    setBusyState(true, "Analyzing risk...");
    const backendUrl = normalizeBackendUrl(backendUrlInput.value);
    const payload = buildInputPayload(pageSignals);

    const response = await fetch(`${backendUrl}${QUICK_ANALYZE_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: payload,
        inputType: "web_snapshot",
        pageUrl: pageSignals.url,
        title: pageSignals.title
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Analysis failed.");
    }

    renderResult(data);
    setBusyState(false, "Screenshot captured and analyzed.");
  } catch (error) {
    showError(error.message || "Unexpected error while analyzing page.");
    setBusyState(false, "Unable to analyze this page.");
  }
}

function renderResult(data) {
  const score = clampNumber(Number(data.riskScore || 0), 0, 100);

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

  resultCard.classList.remove("hidden");
}

function buildInputPayload(pageSignals) {
  return [
    `URL: ${pageSignals.url || ""}`,
    `Title: ${pageSignals.title || ""}`,
    `MetaDescription: ${pageSignals.metaDescription || ""}`,
    `FormCount: ${pageSignals.forms}`,
    `PasswordFieldCount: ${pageSignals.passwordFields}`,
    "VisibleText:",
    pageSignals.visibleText || ""
  ].join("\n");
}

async function extractPageSignals(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: () => {
          const text = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
          const metaTag = document.querySelector("meta[name='description']");

          return {
            url: window.location.href,
            title: document.title || "",
            metaDescription: metaTag ? metaTag.content : "",
            forms: document.querySelectorAll("form").length,
            passwordFields: document.querySelectorAll("input[type='password']").length,
            visibleText: text.slice(0, 6000)
          };
        }
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

async function captureVisibleTab(windowId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, { format: "png", quality: 90 }, (dataUrl) => {
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

async function readStoredBackendUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["backendUrl"], (result) => {
      const value = normalizeBackendUrl(result.backendUrl || DEFAULT_BACKEND_URL);
      resolve(value);
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

function normalizeBackendUrl(url) {
  const clean = (url || "").trim() || DEFAULT_BACKEND_URL;
  return clean.endsWith("/") ? clean.slice(0, -1) : clean;
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
