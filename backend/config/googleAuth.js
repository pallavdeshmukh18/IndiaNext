const { google } = require("googleapis");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

const tokenStore = new Map();
let latestUserId = null;

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl() {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

function storeUserTokens(userId, tokens) {
  tokenStore.set(userId, tokens);
  latestUserId = userId;
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
};
