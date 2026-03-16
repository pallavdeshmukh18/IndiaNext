const getRecommendation = (threatType, riskScore) => {
    if (riskScore < 40) {
        return "No action required. Input appears safe.";
    }

    switch (threatType.toLowerCase()) {
        case "phishing":
            if (riskScore > 80) {
                return "CRITICAL: Do not click any links or provide personal information. Block the sender and report to IT security immediately.";
            }
            return "WARNING: This message exhibits phishing characteristics. Verify the sender's identity through a separate, trusted channel before proceeding.";
        
        case "suspicious url":
             if (riskScore > 80) {
                 return "CRITICAL: The URL is highly suspicious. Do not open the link. Consider blacklisting the domain.";
             }
             return "WARNING: The URL may lead to a dangerous site. Inspect the domain carefully before clicking.";

        case "prompt injection":
            return "ACTION REQUIRED: Input attempts to manipulate system behavior. Reject the input and log the attempt for security review.";

        default:
            if (riskScore > 75) {
               return "HIGH RISK: Anomalous highly suspicious behavior detected. Quarantine the interaction and investigate.";
            }
            return "CAUTION: Suspicious elements found. Proceed with caution and verify the source.";
    }
};

module.exports = {
    getRecommendation
}
