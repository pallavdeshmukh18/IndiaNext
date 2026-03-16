const { execFile } = require("child_process");
const path = require("path");
const util = require("util");

const execFileAsync = util.promisify(execFile);

async function analyzeEmail(emailData) {
  const scriptPath = path.join(__dirname, "ml_bridge.py");
  const pythonBin = process.env.PYTHON_BIN || "python3";
  const { stdout } = await execFileAsync(pythonBin, [scriptPath, JSON.stringify(emailData)], {
    maxBuffer: 1024 * 1024,
  });

  const result = JSON.parse(stdout.trim());

  if (!Array.isArray(result.explanation)) {
    result.explanation = [];
  }

  result.scam_probability = Number(result.scam_probability || 0);
  result.risk_score = Number(result.risk_score ?? result.scam_probability * 100);
  result.risk_level = result.risk_level || "LOW";
  result.model_source = result.model_source || "ML/phishing_mail/phishing_model.pkl";
  result.score_basis =
    result.score_basis ||
    "Risk score is derived from the local phishing model probability on a 0-100 scale.";

  if (result.explanation.length === 0) {
    result.explanation = [`Model confidence: ${(Number(result.scam_probability) * 100).toFixed(1)}%`];
  }

  if (!result.explainability) {
    result.explainability = {
      label: result.label || "unknown",
      confidencePercent: Number((Number(result.scam_probability || 0) * 100).toFixed(1)),
      summary: Array.isArray(result.explanation) ? result.explanation.join(" ") : String(result.explanation || ""),
      indicators: Array.isArray(result.explanation) ? result.explanation.slice(0, 5) : []
    };
  }

  return result;
}

module.exports = {
  analyzeEmail,
};
