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

  if (result.explanation.length === 0) {
    result.explanation = [`Model confidence: ${(Number(result.scam_probability) * 100).toFixed(1)}%`];
  }

  return result;
}

module.exports = {
  analyzeEmail,
};
