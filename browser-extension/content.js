function collectPageSignals(maxTextLength = 6000) {
  const normalizeText = (value) => (value || "").replace(/\s+/g, " ").trim();

  const pageText = normalizeText(document.body ? document.body.innerText : "");
  const metaDescriptionTag = document.querySelector("meta[name='description']");

  const anchors = Array.from(document.querySelectorAll("a[href]"));
  const currentHost = window.location.hostname.replace(/^www\./i, "");

  let linkCount = 0;
  let externalLinkCount = 0;
  let suspiciousLinkCount = 0;

  const suspiciousHrefPattern = /(bit\.ly|tinyurl|@|%40|verify|login|secure|update|account)/i;

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    if (!href) continue;

    try {
      const parsed = new URL(href, window.location.href);
      if (!/^https?:$/i.test(parsed.protocol)) continue;

      linkCount += 1;

      const targetHost = parsed.hostname.replace(/^www\./i, "");
      if (targetHost && currentHost && targetHost !== currentHost) {
        externalLinkCount += 1;
      }

      if (suspiciousHrefPattern.test(parsed.href)) {
        suspiciousLinkCount += 1;
      }
    } catch (error) {
      // Ignore malformed links and continue parsing the page.
    }
  }

  const forms = document.querySelectorAll("form").length;
  const passwordFields = document.querySelectorAll("input[type='password']").length;

  const suspiciousKeywords = [
    "urgent",
    "verify your account",
    "account suspended",
    "password",
    "bank",
    "security alert",
    "login",
    "click here",
    "update account"
  ];

  const loweredContext = `${document.title || ""} ${pageText}`.toLowerCase();
  let suspiciousKeywordHits = 0;
  for (const keyword of suspiciousKeywords) {
    if (loweredContext.includes(keyword)) suspiciousKeywordHits += 1;
  }

  return {
    url: window.location.href,
    title: document.title || "",
    metaDescription: normalizeText(metaDescriptionTag ? metaDescriptionTag.content : ""),
    forms,
    passwordFields,
    linkCount,
    externalLinkCount,
    suspiciousLinkCount,
    suspiciousKeywordHits,
    visibleText: pageText.slice(0, maxTextLength),
    capturedAt: new Date().toISOString()
  };
}

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
