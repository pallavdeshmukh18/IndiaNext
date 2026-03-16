const SERVICES = {
  "1": {
    key: "email_phishing",
    label: "Email Phishing",
    endpoint: "/ml/email-phishing",
    prompts: {
      text: "Please paste the email content you want Krypton to analyze.",
      image: "Upload a screenshot of the email. Krypton will extract the content for analysis.",
      file: "Upload the email file or attachment you want analyzed.",
    },
  },
  "2": {
    key: "url_phishing",
    label: "URL Phishing",
    endpoint: "/ml/url-phishing",
    prompts: {
      text: "Please paste the URL you want Krypton to scan.",
      image: "Upload a screenshot that contains the URL. Krypton will extract it for analysis.",
      file: "Upload the file or screenshot that contains the suspicious link.",
    },
  },
  "3": {
    key: "ai_content",
    label: "AI Generated Content",
    endpoint: "/ml/ai-content",
    prompts: {
      text: "Please paste the content you want checked for AI generation.",
      image: "Upload a screenshot of the content. Krypton will extract the text first.",
      file: "Upload the document or file you want checked.",
    },
  },
  "4": {
    key: "anomaly",
    label: "Anomaly Detection",
    endpoint: "/ml/anomaly",
    prompts: {
      text: "Please paste the logs, activity details, or transaction data you want analyzed.",
      image: "Upload a screenshot of the suspicious activity. Krypton will extract the details.",
      file: "Upload the log file, report, or suspicious file for analysis.",
    },
  },
  "5": {
    key: "deepfake_voice",
    label: "Deepfake Voice",
    endpoint: "/ml/deepfake-voice",
    prompts: {
      text: "Please paste any transcript or context for the voice sample you want reviewed.",
      image: "Upload a screenshot with context about the voice sample if that helps your investigation.",
      file: "Upload the audio file you want Krypton to analyze for deepfake voice signals.",
    },
  },
  "6": {
    key: "deepfake_image",
    label: "Deepfake Image",
    endpoint: "/ml/deepfake-image",
    prompts: {
      text: "Please paste any context or claim related to the image you want checked.",
      image: "Upload the image you want Krypton to analyze for deepfake signals.",
      file: "Upload the image file you want analyzed.",
    },
  },
  "7": {
    key: "prompt_injection",
    label: "Prompt Injection Attack",
    endpoint: "/ml/prompt-injection",
    prompts: {
      text: "Please paste the prompt or model interaction you want analyzed.",
      image: "Upload a screenshot of the prompt or model output. Krypton will extract the text.",
      file: "Upload the file or transcript that contains the prompt injection attempt.",
    },
  },
};

const INPUT_TYPES = {
  "1": { key: "text", label: "Text input" },
  "2": { key: "image", label: "Screenshot / image" },
  "3": { key: "file", label: "File upload" },
};

const getServiceBySelection = (selection) => SERVICES[String(selection).trim()] || null;

const getInputTypeBySelection = (selection) => INPUT_TYPES[String(selection).trim()] || null;

const getServiceByKey = (serviceKey) =>
  Object.values(SERVICES).find((service) => service.key === serviceKey) || null;

const getServiceMenuText = () => [
  "Welcome to Krypton AI Security Bot",
  "",
  "What type of detection would you like?",
  "",
  "1 Email Phishing",
  "2 URL Phishing",
  "3 AI Generated Content",
  "4 Anomaly Detection",
  "5 Deepfake Voice",
  "6 Deepfake Image",
  "7 Prompt Injection Attack",
  "",
  "Reply with the number.",
].join("\n");

const getInputMenuText = (serviceLabel) => [
  `You selected ${serviceLabel}.`,
  "",
  "How would you like to provide the data?",
  "",
  "1 Text input",
  "2 Screenshot / image",
  "3 File upload",
  "",
  "Reply with the number.",
].join("\n");

module.exports = {
  getInputMenuText,
  getInputTypeBySelection,
  getServiceByKey,
  getServiceBySelection,
  getServiceMenuText,
};
