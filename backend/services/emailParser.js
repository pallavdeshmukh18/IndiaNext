const URL_REGEX = /\bhttps?:\/\/[^\s<>"')\]]+/gi;
const HTML_LINK_REGEX = /href=["']([^"'#]+)["']/gi;

function decodeBase64Url(content = "") {
  if (!content) {
    return "";
  }

  return Buffer.from(content.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function stripHtml(html = "") {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHeader(headers = [], name) {
  return headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

function collectParts(payload, collector = { plainText: [], html: [], attachments: [] }) {
  if (!payload) {
    return collector;
  }

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    collector.plainText.push(decodeBase64Url(payload.body.data));
  }

  if (payload.mimeType === "text/html" && payload.body?.data) {
    collector.html.push(decodeBase64Url(payload.body.data));
  }

  if (payload.filename && payload.body?.attachmentId) {
    collector.attachments.push({
      filename: payload.filename,
      mimeType: payload.mimeType || "application/octet-stream",
      size: payload.body.size || 0,
      attachmentId: payload.body.attachmentId,
    });
  }

  if (Array.isArray(payload.parts)) {
    payload.parts.forEach((part) => collectParts(part, collector));
  }

  return collector;
}

function extractLinks(text = "", html = "") {
  const links = new Set();

  for (const match of text.match(URL_REGEX) || []) {
    links.add(match);
  }

  HTML_LINK_REGEX.lastIndex = 0;
  let htmlMatch = HTML_LINK_REGEX.exec(html);
  while (htmlMatch) {
    links.add(htmlMatch[1]);
    htmlMatch = HTML_LINK_REGEX.exec(html);
  }

  return Array.from(links);
}

function parseEmailMessage(email) {
  const payload = email.payload || {};
  const parts = collectParts(payload);
  const htmlBody = parts.html.join("\n");
  const plainTextBody = parts.plainText.join("\n");
  const body =
    plainTextBody.trim() ||
    stripHtml(htmlBody) ||
    stripHtml(decodeBase64Url(payload.body?.data || "")) ||
    email.snippet ||
    "";

  return {
    subject: extractHeader(payload.headers, "Subject") || "(No Subject)",
    sender: extractHeader(payload.headers, "From") || "Unknown sender",
    body,
    links: extractLinks(body, htmlBody),
    attachments: parts.attachments,
    snippet: email.snippet || "",
  };
}

module.exports = {
  parseEmailMessage,
  URL_REGEX,
};
