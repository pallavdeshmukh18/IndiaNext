const {
  clearConversation,
  getConversation,
  resetConversation,
  updateConversation,
} = require("./conversationManager");
const { analyzeWithMl } = require("./mlClient");
const {
  getInputMenuText,
  getInputTypeBySelection,
  getServiceByKey,
  getServiceBySelection,
  getServiceMenuText,
} = require("./serviceRouter");
const { detectMediaKind, downloadMedia, extractTextFromImage } = require("./mediaHandler");

const GLOBAL_MENU_COMMANDS = new Set(["menu", "restart", "reset", "home", "start"]);

const isGreeting = (message) => /^(hi|hello|hey|hola|namaste)$/i.test(message.trim());

const buildReply = (message) => ({
  message,
});

const buildAnalysisReply = (result) => [
  "Scam Analysis Result",
  "",
  `Risk Score: ${result.risk_score ?? "N/A"}`,
  "",
  `Classification: ${result.label || "Unknown"}`,
  "",
  "Explanation:",
  result.explanation || "No explanation was returned by the analysis engine.",
  "",
  "Would you like to run another scan?",
  "",
  "1 Yes",
  "2 No",
].join("\n");

const buildInvalidServiceReply = () => [
  "Please choose a valid detection option.",
  "",
  getServiceMenuText(),
].join("\n");

const buildInvalidInputReply = (service) => [
  `Please choose a valid input option for ${service.label}.`,
  "",
  getInputMenuText(service.label),
].join("\n");

const buildPromptForInput = (service, inputType) => {
  const prompt = service.prompts[inputType.key];

  if (prompt) {
    return prompt;
  }

  return "Please share the data you want Krypton to analyze.";
};

const getMediaDescriptor = (reqBody) => ({
  numMedia: Number(reqBody.NumMedia || 0),
  mediaUrl: reqBody.MediaUrl0,
  contentType: reqBody.MediaContentType0 || "",
  fileName: reqBody.MediaFilename0 || null,
});

const normalizeTextPayload = (service, text, state, mediaMeta = {}) => ({
  text,
  input: text,
  content: text,
  service: service.key,
  phone: state.phone,
  inputType: state.inputType,
  mimeType: mediaMeta.contentType || null,
  fileName: mediaMeta.fileName || null,
  source: "whatsapp",
});

const normalizeBinaryPayload = (service, buffer, state, mediaMeta = {}) => {
  const base64 = buffer.toString("base64");

  if (service.key === "deepfake_voice") {
    return {
      audioBase64: base64,
      mimeType: mediaMeta.contentType || null,
      fileName: mediaMeta.fileName || null,
      service: service.key,
      phone: state.phone,
      source: "whatsapp",
    };
  }

  if (service.key === "deepfake_image") {
    return {
      imageBase64: base64,
      mimeType: mediaMeta.contentType || null,
      fileName: mediaMeta.fileName || null,
      service: service.key,
      phone: state.phone,
      source: "whatsapp",
    };
  }

  return {
    fileBase64: base64,
    mimeType: mediaMeta.contentType || null,
    fileName: mediaMeta.fileName || null,
    service: service.key,
    phone: state.phone,
    source: "whatsapp",
  };
};

const processWaitingInput = async (bodyText, reqBody, state) => {
  const service = getServiceByKey(state.service);

  if (!service) {
    resetConversation(state.phone);
    return buildReply(getServiceMenuText());
  }

  const media = getMediaDescriptor(reqBody);
  let payload;

  if (state.inputType === "text") {
    if (!bodyText) {
      return buildReply("Please paste the text you want Krypton to analyze.");
    }

    payload = normalizeTextPayload(service, bodyText, state);
  } else {
    if (!media.numMedia || !media.mediaUrl) {
      return buildReply(buildPromptForInput(service, { key: state.inputType }));
    }

    const buffer = await downloadMedia(media.mediaUrl);
    const mediaKind = detectMediaKind(media.contentType);

    if (state.inputType === "image") {
      if (mediaKind !== "image") {
        return buildReply("Please upload an image or screenshot for this scan.");
      }

      if (service.key === "deepfake_image") {
        payload = normalizeBinaryPayload(service, buffer, state, media);
      } else {
        const extractedText = await extractTextFromImage(buffer, media);
        payload = normalizeTextPayload(service, extractedText, state, media);
      }
    }

    if (state.inputType === "file") {
      if (service.key === "deepfake_voice") {
        if (mediaKind !== "audio") {
          return buildReply("Please upload an audio file for deepfake voice analysis.");
        }

        payload = normalizeBinaryPayload(service, buffer, state, media);
      } else if (mediaKind === "image" && service.key !== "deepfake_image") {
        const extractedText = await extractTextFromImage(buffer, media);
        payload = normalizeTextPayload(service, extractedText, state, media);
      } else {
        payload = normalizeBinaryPayload(service, buffer, state, media);
      }
    }
  }

  const result = await analyzeWithMl(service, payload);
  updateConversation(state.phone, { step: "another_scan" });

  return buildReply(buildAnalysisReply(result));
};

const handleContinueStep = (bodyText, phone) => {
  if (bodyText === "1") {
    updateConversation(phone, {
      step: "choose_service",
      service: null,
      inputType: null,
    });

    return buildReply(getServiceMenuText());
  }

  if (bodyText === "2") {
    clearConversation(phone);
    return buildReply("Thanks for using Krypton AI Security Bot. Reply with any message whenever you want to start another scan.");
  }

  return buildReply("Reply with 1 for Yes or 2 for No.");
};

const handleIncomingWhatsappMessage = async (reqBody) => {
  const phone = reqBody.From || "unknown";
  const bodyText = String(reqBody.Body || "").trim();
  const state = getConversation(phone);

  if (!bodyText && Number(reqBody.NumMedia || 0) === 0) {
    return buildReply("Please send a message or upload media so Krypton can help you.");
  }

  if (GLOBAL_MENU_COMMANDS.has(bodyText.toLowerCase()) || state.step === "menu" || isGreeting(bodyText)) {
    updateConversation(phone, {
      step: "choose_service",
      service: null,
      inputType: null,
    });

    return buildReply(getServiceMenuText());
  }

  if (state.step === "choose_service") {
    const service = getServiceBySelection(bodyText);

    if (!service) {
      return buildReply(buildInvalidServiceReply());
    }

    updateConversation(phone, {
      step: "choose_input",
      service: service.key,
      inputType: null,
    });

    return buildReply(getInputMenuText(service.label));
  }

  if (state.step === "choose_input") {
    const service = getServiceByKey(state.service);
    const inputType = getInputTypeBySelection(bodyText);

    if (!service) {
      resetConversation(phone);
      return buildReply(getServiceMenuText());
    }

    if (!inputType) {
      return buildReply(buildInvalidInputReply(service));
    }

    updateConversation(phone, {
      step: "waiting_input",
      inputType: inputType.key,
    });

    return buildReply(buildPromptForInput(service, inputType));
  }

  if (state.step === "waiting_input") {
    return processWaitingInput(bodyText, reqBody, state);
  }

  if (state.step === "another_scan") {
    return handleContinueStep(bodyText, phone);
  }

  resetConversation(phone);
  return buildReply(getServiceMenuText());
};

module.exports = {
  handleIncomingWhatsappMessage,
};
