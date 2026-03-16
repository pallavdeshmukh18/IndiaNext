const express = require("express");

const { createOAuthClient, getLatestUserTokens, getUserTokens } = require("../config/googleAuth");
const { fetchLatestEmails } = require("../services/gmailService");
const { parseEmailMessage } = require("../services/emailParser");
const { analyzeEmail } = require("../services/mlBridge");
const EmailScan = require("../models/EmailScan");

const router = express.Router();

router.get("/", async (req, res) => {
  const requestedUserId = req.query.userId || req.query.email;
  const tokenContext = requestedUserId
    ? { userId: requestedUserId, tokens: getUserTokens(requestedUserId) }
    : getLatestUserTokens();

  if (!tokenContext?.tokens) {
    return res.status(401).json({
      error: "No connected Gmail account found. Authenticate at /auth/google first.",
    });
  }

  try {
    const authClient = createOAuthClient();
    authClient.setCredentials(tokenContext.tokens);

    const emails = await fetchLatestEmails(authClient, {
      maxResults: req.query.maxResults || process.env.GMAIL_MAX_RESULTS,
    });

    const results = await Promise.all(
      emails.map(async (email) => {
        const parsedEmail = parseEmailMessage(email);
        const mlResult = await analyzeEmail(parsedEmail);

        const scanRecord = await EmailScan.create({
          userId: tokenContext.userId,
          subject: parsedEmail.subject,
          sender: parsedEmail.sender,
          body: parsedEmail.body,
          links: parsedEmail.links,
          attachments: parsedEmail.attachments,
          snippet: parsedEmail.snippet,
          scamProbability: mlResult.scam_probability,
          label: mlResult.label,
          explanation: mlResult.explanation,
        });

        return {
          id: scanRecord._id,
          userId: scanRecord.userId,
          subject: scanRecord.subject,
          sender: scanRecord.sender,
          body: scanRecord.body,
          snippet: scanRecord.snippet,
          links: scanRecord.links,
          attachments: scanRecord.attachments,
          scamProbability: scanRecord.scamProbability,
          label: scanRecord.label,
          explanation: scanRecord.explanation,
          explainability: mlResult.explainability || null,
          createdAt: scanRecord.createdAt,
        };
      })
    );

    return res.json({
      userId: tokenContext.userId,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error("Scan failed:", error.response?.data || error.message);
    return res.status(500).json({
      error: "Failed to scan Gmail messages.",
      details: error.message,
    });
  }
});

module.exports = router;
