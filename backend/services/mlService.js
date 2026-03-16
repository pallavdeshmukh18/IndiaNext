const { analyzeUnifiedThreatInput } = require("./securitySuiteService");

const detectThreat = async (input, _context = {}) => {
  return analyzeUnifiedThreatInput(input);
};

module.exports = {
  detectThreat
};
