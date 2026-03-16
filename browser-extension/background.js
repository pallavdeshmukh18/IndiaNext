chrome.runtime.onInstalled.addListener(() => {
  console.log("[Threat Lens] Background service worker ready.");
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