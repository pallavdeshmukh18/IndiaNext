const express = require("express");
const { google } = require("googleapis");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const {
  createOAuthClient,
  getAuthUrl,
  storeUserTokens,
} = require("../config/googleAuth");

const router = express.Router();

// STEP 1 — Redirect to Google
router.get("/google", (req, res) => {
  res.redirect(getAuthUrl());
});

// STEP 2 — Google Callback
router.get("/google/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Missing OAuth code" });
  }

  try {
    const client = createOAuthClient();

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: client,
      version: "v2",
    });

    const { data: profile } = await oauth2.userinfo.get();

    // 🔥 Find or create user
    let user = await User.findOne({ email: profile.email });

    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        googleId: profile.id,
        authProvider: "google",
        avatar: profile.picture,
      });
    } else {
      user.name = profile.name || user.name;
      user.googleId = profile.id || user.googleId;
      user.avatar = profile.picture || user.avatar;
      user.authProvider = "google";
      await user.save();
    }

    // 🔥 Generate JWT
    const token = generateToken(user._id);
    storeUserTokens(String(user._id), tokens, user.email);

    // 🔥 Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_APP_URL || 'http://localhost:5173';

    return res.redirect(
      `${frontendUrl}/auth-success?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(String(user._id))}&email=${encodeURIComponent(user.email || "")}&name=${encodeURIComponent(user.name || "")}`
    );

  } catch (error) {
    console.error("Google OAuth Error:", error);

    const frontendUrl = process.env.FRONTEND_APP_URL || 'http://localhost:5173';
    return res.redirect(
      `${frontendUrl}/auth-error`
    );
  }
});

module.exports = router;