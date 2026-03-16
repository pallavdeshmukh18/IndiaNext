const express = require("express");
const { google } = require("googleapis");

const {
  createOAuthClient,
  getAuthUrl,
  storeUserTokens,
} = require("../config/googleAuth");

const router = express.Router();

router.get("/google", (req, res) => {
  const frontendRedirect = req.query.redirect;
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
    const parsedState = state
      ? JSON.parse(Buffer.from(state, "base64url").toString("utf8"))
      : null;
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: client, version: "v2" });
    const { data: profile } = await oauth2.userinfo.get();
    const userId = profile.email || profile.id;

    storeUserTokens(userId, tokens);

    if (parsedState?.redirect) {
      const redirectUrl = new URL(parsedState.redirect);
      redirectUrl.searchParams.set("status", "success");
      redirectUrl.searchParams.set("userId", userId);
      if (profile.email) {
        redirectUrl.searchParams.set("email", profile.email);
      }
      return res.redirect(redirectUrl.toString());
    }

    return res.json({
      message: "Google account connected successfully.",
      user: {
        userId,
        email: profile.email,
      },
    });
  } catch (error) {
    console.error("OAuth callback failed:", error.response?.data || error.message);

    if (state) {
      try {
        const parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
        if (parsedState?.redirect) {
          const redirectUrl = new URL(parsedState.redirect);
          redirectUrl.searchParams.set("status", "error");
          redirectUrl.searchParams.set("message", error.message);
          return res.redirect(redirectUrl.toString());
        }
      } catch (stateError) {
        console.error("Failed to decode OAuth state:", stateError.message);
      }
    }

    return res.status(500).json({
      error: "Failed to authenticate with Google.",
      details: error.message,
    });
  }
});

module.exports = router;
