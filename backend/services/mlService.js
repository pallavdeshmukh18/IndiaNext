const detectThreat = async (input) => {
    // In a real application, this would call an external ML API or a local model.
    // Here we're using a heuristic/mock approach for the hackathon prototype.
    console.log(`Analyzing input: ${input.substring(0, 50)}...`);

    const lowerInput = input.toLowerCase();
    
    // Basic heuristic checks
    const phishingKeywords = ["password", "urgent", "account suspended", "click here", "verify your account", "login", "bank"];
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const promptInjectionKeywords = ["ignore previous instructions", "system prompt", "bypass", "jailbreak", "you are now"];
    
    let riskScore = 10; // Base score
    let explanations = [];
    let threatType = "Safe";
    
    // Check for Phishing
    let phishingHits = 0;
    for (const keyword of phishingKeywords) {
        if (lowerInput.includes(keyword)) {
            phishingHits++;
            riskScore += 15;
            explanations.push(`Found keyword associated with phishing: "${keyword}"`);
        }
    }

    if (phishingHits > 2) {
        threatType = "Phishing";
    }

    // Check for URLs
    const urlsFound = input.match(urlPattern);
    if (urlsFound) {
        riskScore += 20;
        explanations.push(`Contains ${urlsFound.length} URL(s) which could be malicious.`);
        if (threatType === "Safe") threatType = "Suspicious URL";
    }

    // Check for Prompt Injection
    let injectionHits = 0;
    for (const keyword of promptInjectionKeywords) {
        if (lowerInput.includes(keyword)) {
            injectionHits++;
            riskScore += 30;
            explanations.push(`Found language attempting to override system instructions: "${keyword}"`);
        }
    }

    if (injectionHits > 0) {
        threatType = "Prompt Injection";
    }

    // Cap score at 100
    riskScore = Math.min(riskScore, 100);
    
    const isSuspicious = riskScore > 40;
    
    // Default explanation if nothing specific is found but score is somehow high
    if (explanations.length === 0 && isSuspicious) {
        explanations.push("Anomalous pattern detected by baseline heuristic model.");
    }
    
    if (explanations.length === 0 && !isSuspicious) {
         explanations.push("No obvious malicious patterns found in the input.");
    }

    return {
        isSuspicious,
        riskScore,
        threatType: isSuspicious ? threatType : "None",
        explanation: explanations.join(" "),
    };
};

module.exports = {
    detectThreat
};
