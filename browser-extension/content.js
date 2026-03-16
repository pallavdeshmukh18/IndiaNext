const MESSAGE_TYPE = "PAGE_DATA";
const OBSERVER_DEBOUNCE_MS = 1000;

function collectPageSignals() {
  if (!globalThis.ScamuraiDomExtractor?.extractPageSignals) {
    throw new Error("Scamurai DOM extractor is not available.");
  }

  return globalThis.ScamuraiDomExtractor.extractPageSignals();
}

function sendPageData() {
  const data = collectPageSignals();

  console.log("[Scamurai] DOM Extracted", data);
  console.log("[Scamurai] Sending page data to backend");

  chrome.runtime.sendMessage({
    type: MESSAGE_TYPE,
    data,
  });
}

sendPageData();

let mutationTimer = null;
const observer = new MutationObserver(() => {
  if (mutationTimer) {
    clearTimeout(mutationTimer);
  }

  mutationTimer = setTimeout(() => {
    try {
      sendPageData();
    } catch (error) {
      console.error("[Scamurai] Failed to re-extract DOM after mutation", error);
    }
  }, OBSERVER_DEBOUNCE_MS);
});

observer.observe(document.documentElement || document.body, {
  childList: true,
  subtree: true,
  attributes: true,
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "GET_SCREEN_SIGNALS") {
    return;
  }

  try {
    const signals = collectPageSignals();
    sendResponse({ ok: true, signals });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error && error.message ? error.message : "Could not read screen signals."
    });
  }
});
