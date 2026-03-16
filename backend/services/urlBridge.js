const { execFile } = require("child_process");
const path = require("path");
const util = require("util");

const execFileAsync = util.promisify(execFile);

async function analyzeUrl(url) {
  const scriptPath = path.join(__dirname, "..", "..", "ML", "phishing_url", "predict.py");
  const pythonBin = process.env.PYTHON_BIN || "python3";
  const { stdout } = await execFileAsync(pythonBin, [scriptPath, url], {
    maxBuffer: 1024 * 1024,
  });

  const result = JSON.parse(stdout.trim());
  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

module.exports = {
  analyzeUrl,
};
