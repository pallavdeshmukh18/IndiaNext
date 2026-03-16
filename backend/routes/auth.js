const express = require("express");
const { google } = require("googleapis");

const {
  createOAuthClient,
  getAuthUrl,
  storeUserTokens,
} = require("../config/googleAuth");

const router = express.Router();

router.get("/google", (_req, res) => {
  res.redirect(getAuthUrl());
});

router.get("/google/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Missing OAuth code." });
  }

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: client, version: "v2" });
    const { data: profile } = await oauth2.userinfo.get();
    const userId = profile.email || profile.id;

    storeUserTokens(userId, tokens);

    return res.json({
      message: "Google account connected successfully.",
      user: {
        userId,
        email: profile.email,
      },
    });
  } catch (error) {
    console.error("OAuth callback failed:", error.response?.data || error.message);
    return res.status(500).json({
      error: "Failed to authenticate with Google.",
      details: error.message,
    });
  }
});

module.exports = router;
