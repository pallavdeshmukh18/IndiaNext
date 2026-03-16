const express = require("express");
const { google } = require("googleapis");

const {
  createOAuthClient,
  getAuthUrl,
  storeUserTokens,
} = require("../config/googleAuth");

const router = express.Router();

function normalizeHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    return url;
  } catch (_error) {
    return null;
  }
}

function buildFrontendCallbackUrl(req, explicitRedirect) {
  const direct = normalizeHttpUrl(explicitRedirect);
  if (direct) {
    return direct.toString();
  }

  const configuredFrontend = normalizeHttpUrl(
    process.env.FRONTEND_APP_URL || process.env.FRONTEND_URL
  );

  if (configuredFrontend) {
    configuredFrontend.pathname = "/auth/google/callback";
    configuredFrontend.search = "";
    configuredFrontend.hash = "";
    return configuredFrontend.toString();
  }

  const referer = normalizeHttpUrl(req.get("referer"));
  if (referer) {
    referer.pathname = "/auth/google/callback";
    referer.search = "";
    referer.hash = "";
    return referer.toString();
  }

  return null;
}

function decodeOAuthState(state) {
  if (!state) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
  } catch (_error) {
    return null;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderOAuthStatusPage(res, options = {}) {
  const {
    title,
    message,
    status = "success",
    userId,
    email,
    frontendUrl,
    backendScanUrl
  } = options;

  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeUserId = escapeHtml(userId);
  const safeEmail = escapeHtml(email);
  const safeFrontendUrl = frontendUrl ? escapeHtml(frontendUrl) : "";
  const safeBackendScanUrl = backendScanUrl ? escapeHtml(backendScanUrl) : "";

  return res.status(status === "error" ? 500 : 200).type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #121214; color: #f5f5f7; }
      .page { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      .card { width: min(560px, 100%); background: linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)); border: 1px solid rgba(255,255,255,0.1); border-radius: 18px; padding: 24px; box-shadow: 0 18px 44px rgba(0,0,0,0.35); }
      .eyebrow { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #9ea4bb; margin: 0 0 12px; }
      h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.1; }
      p { margin: 0; color: #c8cbda; line-height: 1.6; }
      .meta { margin-top: 16px; padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }
      .meta strong { display: block; color: #fff; margin-bottom: 6px; }
      .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
      .button { display: inline-flex; align-items: center; justify-content: center; padding: 10px 14px; border-radius: 10px; font-weight: 600; text-decoration: none; }
      .button-primary { background: #f5f5f7; color: #121214; }
      .button-secondary { background: rgba(255,255,255,0.05); color: #f5f5f7; border: 1px solid rgba(255,255,255,0.12); }
      .hint { margin-top: 16px; font-size: 13px; color: #9ea4bb; }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="card">
        <p class="eyebrow">IndiaNext Gmail Connect</p>
        <h1>${safeTitle}</h1>
        <p>${safeMessage}</p>
        ${safeUserId || safeEmail ? `<div class="meta"><strong>Connected account</strong><p>${safeEmail || safeUserId}</p></div>` : ""}
        <div class="actions">
          ${safeFrontendUrl ? `<a class="button button-primary" href="${safeFrontendUrl}">Open Frontend Inbox</a>` : ""}
          ${safeBackendScanUrl ? `<a class="button button-secondary" href="${safeBackendScanUrl}">Scan Inbox From Backend</a>` : ""}
        </div>
        <p class="hint">If you expected the web app to open automatically, start the OAuth flow from the Inbox page or set FRONTEND_APP_URL in backend/.env.</p>
      </section>
    </main>
  </body>
</html>`);
}

router.get("/google", (req, res) => {
  const frontendRedirect = buildFrontendCallbackUrl(req, req.query.redirect);
  const state = frontendRedirect
    ? Buffer.from(JSON.stringify({ redirect: frontendRedirect })).toString("base64url")
    : undefined;

  res.redirect(getAuthUrl(state));
});

router.get("/google/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Missing OAuth code." });
  }

  try {
    const parsedState = decodeOAuthState(state);
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: client, version: "v2" });
    const { data: profile } = await oauth2.userinfo.get();
    const userId = profile.email || profile.id;

    storeUserTokens(userId, tokens);

    const callbackRedirect = normalizeHttpUrl(
      parsedState?.redirect || buildFrontendCallbackUrl(req)
    );

    if (callbackRedirect) {
      callbackRedirect.searchParams.set("status", "success");
      callbackRedirect.searchParams.set("userId", userId);
      if (profile.email) {
        callbackRedirect.searchParams.set("email", profile.email);
      }
      return res.redirect(callbackRedirect.toString());
    }

    const host = `${req.protocol}://${req.get("host")}`;
    return renderOAuthStatusPage(res, {
      title: "Google account connected",
      message: "Your Gmail account is now connected. Open the inbox view to start scanning recent messages.",
      userId,
      email: profile.email,
      backendScanUrl: `${host}/scan?userId=${encodeURIComponent(userId)}`,
      frontendUrl: null
    });
  } catch (error) {
    console.error("OAuth callback failed:", error.response?.data || error.message);

    const parsedState = decodeOAuthState(state);
    const callbackRedirect = normalizeHttpUrl(
      parsedState?.redirect || buildFrontendCallbackUrl(req)
    );

    if (callbackRedirect) {
      callbackRedirect.searchParams.set("status", "error");
      callbackRedirect.searchParams.set("message", error.message);
      return res.redirect(callbackRedirect.toString());
    }

    return renderOAuthStatusPage(res, {
      title: "Google authorization failed",
      message: error.message || "Failed to authenticate with Google.",
      status: "error"
    });
  }
});

module.exports = router;
