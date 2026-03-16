(function initializeDomExtractor(globalObject) {
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

  function normalizeText(value, max) {
    if (typeof value !== "string") return "";
    const normalized = value.replace(/\s+/g, " ").trim();
    return typeof max === "number" ? normalized.slice(0, max) : normalized;
  }

  function normalizeHost(value) {
    return String(value || "").toLowerCase().replace(/^www\./i, "");
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

  function toAbsoluteUrl(value) {
    try {
      return new URL(value, window.location.href).toString();
    } catch (_error) {
      return "";
    }
  }

  function collectForms() {
    return Array.from(document.querySelectorAll("form")).map((formElement) => ({
      action: normalizeText(formElement.getAttribute("action")) || window.location.href,
      method: (normalizeText(formElement.getAttribute("method")) || "get").toLowerCase(),
      inputs: Array.from(formElement.querySelectorAll("input, select, textarea")).map((field) => ({
        type: normalizeText(field.getAttribute("type")) || field.tagName.toLowerCase(),
        name: normalizeText(field.getAttribute("name")) || normalizeText(field.getAttribute("id"))
      }))
    }));
  }

  function collectLinks() {
    return Array.from(document.querySelectorAll("a[href]"))
      .map((anchor) => toAbsoluteUrl(anchor.getAttribute("href") || anchor.href))
      .filter(Boolean)
      .slice(0, 250);
  }

  function countExternalLinks(links, currentHost) {
    return links.filter((link) => {
      try {
        return normalizeHost(new URL(link).hostname) !== currentHost;
      } catch (_error) {
        return false;
      }
    }).length;
  }

  function countSuspiciousLinks(links) {
    return links.filter((link) => SUSPICIOUS_LINK_PATTERNS.some((pattern) => pattern.test(link))).length;
  }

  function extractPageSignals() {
    const currentHost = normalizeHost(window.location.hostname);
    const title = document.title || "";
    const metaDescription = normalizeText(
      document.querySelector('meta[name="description"]')?.content || "",
      500
    );
    const visibleText = normalizeText(document.body?.innerText || "", 8000);
    const formDetails = collectForms();
    const links = collectLinks();
    const passwordFields = document.querySelectorAll("input[type='password']").length;
    const suspiciousKeywordHits = countKeywordHits([title, metaDescription, visibleText].join(" "));
    const hasLoginForm =
      passwordFields > 0 ||
      suspiciousKeywordHits > 0 ||
      formDetails.some((form) => {
        const inputs = Array.isArray(form?.inputs) ? form.inputs : [];
        return inputs.some((input) => /email|user|login|password|otp|verify/i.test(`${input?.name || ""} ${input?.type || ""}`));
      });

    return {
      url: window.location.href,
      domain: currentHost,
      title,
      metaDescription,
      visibleText,
      pageText: visibleText,
      forms: formDetails,
      formDetails,
      passwordFields,
      hasPasswordField: passwordFields > 0,
      hasLoginForm,
      links,
      linkCount: links.length,
      externalLinkCount: countExternalLinks(links, currentHost),
      suspiciousLinkCount: countSuspiciousLinks(links),
      suspiciousKeywordHits
    };
  }

  globalObject.ScamuraiDomExtractor = {
    extractPageSignals
  };
})(globalThis);