const express = require("express");

const { createOAuthClient, getLatestUserTokens, getUserTokens, loadGmailTokensFromDb, storeUserTokens } = require("../config/googleAuth");
const { fetchLatestEmails } = require("../services/gmailService");
const { parseEmailMessage } = require("../services/emailParser");
const { analyzeEmail } = require("../services/mlBridge");
const EmailScan = require("../models/EmailScan");

const router = express.Router();

router.get("/", async (req, res) => {
  const requestedUserId = req.query.userId || req.query.email;
  let tokenContext;

  if (requestedUserId) {
    let tokens = getUserTokens(requestedUserId);
    if (!tokens) {
      tokens = await loadGmailTokensFromDb(requestedUserId);
      if (tokens) {
        storeUserTokens(requestedUserId, tokens); // warm the in-memory cache
      }
    }
    tokenContext = { userId: requestedUserId, tokens: tokens || null };
  } else {
    tokenContext = getLatestUserTokens();
  }

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
          sentAt: parsedEmail.sentAt,
          scamProbability: mlResult.scam_probability,
          riskScore: mlResult.risk_score,
          riskLevel: mlResult.risk_level,
          label: mlResult.label,
          explanation: mlResult.explanation,
          hfPhishingAnalysis: mlResult.hfPhishingAnalysis || null,
          modelSource: mlResult.model_source,
          scoreBasis: mlResult.score_basis,
        });

        return {
          id: scanRecord._id,
          userId: scanRecord.userId,
          subject: scanRecord.subject,
          sender: scanRecord.sender,
          body: scanRecord.body,
          snippet: scanRecord.snippet,
          sentAt: scanRecord.sentAt,
          links: scanRecord.links,
          attachments: scanRecord.attachments,
          scamProbability: scanRecord.scamProbability,
          riskScore: scanRecord.riskScore,
          riskLevel: scanRecord.riskLevel,
          label: scanRecord.label,
          explanation: scanRecord.explanation,
          hfPhishingAnalysis: scanRecord.hfPhishingAnalysis || mlResult.hfPhishingAnalysis || null,
          explainability: mlResult.explainability || null,
          modelSource: scanRecord.modelSource,
          scoreBasis: scanRecord.scoreBasis,
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
