const User = require("../models/User");

const { google } = require("googleapis");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

const tokenStore = new Map();
let latestUserId = null;

async function persistUserGmailTokens(userId, email, tokens) {
  try {
    const normalizedEmail = String(email || "").toLowerCase();
    await User.findOneAndUpdate(
      { _id: userId },
      { $set: { gmailEmail: normalizedEmail || null, gmailTokens: tokens } },
      { upsert: false }
    );
  } catch (err) {
    // Non-fatal: in-memory store is the primary path
    console.error("Failed to persist Gmail tokens:", err.message);
  }
}

async function loadGmailTokensFromDb(identifier) {
  try {
    const value = String(identifier || "").trim();
    if (!value) {
      return null;
    }

    const query = value.includes("@")
      ? { email: value.toLowerCase() }
      : { _id: value };

    const user = await User.findOne(
      query,
      "gmailTokens"
    ).lean();
    return user?.gmailTokens || null;
  } catch (_err) {
    return null;
  }
}

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl(state) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

function storeUserTokens(userId, tokens, email) {
  const normalizedUserId = String(userId || "").trim();
  const normalizedEmail = String(email || "").toLowerCase().trim();

  if (normalizedUserId) {
    tokenStore.set(normalizedUserId, tokens);
    latestUserId = normalizedUserId;
  }

  if (normalizedEmail) {
    tokenStore.set(normalizedEmail, tokens);
  }

  if (normalizedUserId) {
    persistUserGmailTokens(normalizedUserId, normalizedEmail, tokens).catch(() => { });
  }
}

function getUserTokens(userId) {
  return userId ? tokenStore.get(userId) || null : null;
}

function getLatestUserTokens() {
  if (!latestUserId) {
    return null;
  }

  return {
    userId: latestUserId,
    tokens: tokenStore.get(latestUserId) || null,
  };
}

module.exports = {
  SCOPES,
  createOAuthClient,
  getAuthUrl,
  storeUserTokens,
  getUserTokens,
  getLatestUserTokens,
  loadGmailTokensFromDb,
};
