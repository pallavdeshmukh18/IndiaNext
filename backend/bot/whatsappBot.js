const {
  clearConversation,
  getConversation,
  resetConversation,
  updateConversation,
} = require("./conversationManager");
const { analyzeWithMl } = require("./mlClient");
const {
  getInputMenuText,
  getInputQuickReplies,
  getInputTypeBySelection,
  getServiceByKey,
  getServiceListItems,
  getServiceBySelection,
  getServiceMenuText,
} = require("./serviceRouter");
const { detectMediaKind, downloadMedia, extractTextFromImage } = require("./mediaHandler");

const GLOBAL_MENU_COMMANDS = new Set(["menu", "restart", "reset", "home", "start"]);
const RESTART_SELECTIONS = new Set(["1", "yes", "scan_again", "next:scan_again", "scan again"]);
const END_SELECTIONS = new Set(["2", "no", "done", "next:done", "end_session"]);

const isGreeting = (message) => /^(hi|hello|hey|hola|namaste)$/i.test(message.trim());

const buildReply = (message, interactive = null, sendTextAlongsideInteractive = false) => ({
  message,
  interactive,
  sendTextAlongsideInteractive,
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
  "Use the buttons below or reply Yes / No.",
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

const buildMainMenuInteractive = () => ({
  template: "main_menu",
  variables: {},
  preview: {
    type: "list-picker",
    button: "Choose a scan",
    items: getServiceListItems(),
  },
});

const buildInputMenuInteractive = (service) => ({
  template: "input_menu",
  variables: {},
  preview: {
    type: "quick-reply",
    actions: getInputQuickReplies(),
  },
});

const buildRescanInteractive = () => ({
  template: "rescan_menu",
  variables: {},
  preview: {
    type: "quick-reply",
    actions: [
      { id: "next:scan_again", title: "Scan Again" },
      { id: "next:done", title: "Done" },
    ],
  },
});

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
      } else if (
        service.key === "email_phishing" ||
        service.key === "url_phishing" ||
        service.key === "ai_content" ||
        service.key === "anomaly" ||
        service.key === "prompt_injection"
      ) {
        return buildReply(
          "This scan works best with pasted text or an image screenshot. Please send text directly or upload a screenshot so Krypton can extract the content."
        );
      } else {
        payload = normalizeBinaryPayload(service, buffer, state, media);
      }
    }
  }

  const result = await analyzeWithMl(service, payload);
  updateConversation(state.phone, { step: "another_scan" });

  return buildReply(buildAnalysisReply(result), buildRescanInteractive(), true);
};

const handleContinueStep = (selection, phone) => {
  const normalizedSelection = String(selection || "").trim().toLowerCase();

  if (RESTART_SELECTIONS.has(normalizedSelection)) {
    updateConversation(phone, {
      step: "choose_service",
      service: null,
      inputType: null,
    });

    return buildReply(getServiceMenuText(), buildMainMenuInteractive());
  }

  if (END_SELECTIONS.has(normalizedSelection)) {
    clearConversation(phone);
    return buildReply("Thanks for using Krypton AI Security Bot. Reply with any message whenever you want to start another scan.");
  }

  return buildReply("Use the buttons below or reply Yes / No.", buildRescanInteractive());
};

const handleIncomingWhatsappMessage = async (reqBody) => {
  const phone = reqBody.From || "unknown";
  const bodyText = String(reqBody.Body || "").trim();
  const buttonText = String(reqBody.ButtonText || "").trim();
  const buttonPayload = String(reqBody.ButtonPayload || "").trim();
  const selection = buttonPayload || buttonText || bodyText;
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

    return buildReply(getServiceMenuText(), buildMainMenuInteractive());
  }

  if (state.step === "choose_service") {
    const service = getServiceBySelection(selection);

    if (!service) {
      return buildReply(buildInvalidServiceReply(), buildMainMenuInteractive());
    }

    updateConversation(phone, {
      step: "choose_input",
      service: service.key,
      inputType: null,
    });

    return buildReply(getInputMenuText(service.label), buildInputMenuInteractive(service));
  }

  if (state.step === "choose_input") {
    const service = getServiceByKey(state.service);
    const inputType = getInputTypeBySelection(selection);

    if (!service) {
      resetConversation(phone);
      return buildReply(getServiceMenuText(), buildMainMenuInteractive());
    }

    if (!inputType) {
      return buildReply(buildInvalidInputReply(service), buildInputMenuInteractive(service));
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
    return handleContinueStep(selection, phone);
  }

  resetConversation(phone);
  return buildReply(getServiceMenuText(), buildMainMenuInteractive());
};

module.exports = {
  handleIncomingWhatsappMessage,
};
