const axios = require("axios");

const getTwilioAuth = () => {
  const username = process.env.TWILIO_ACCOUNT_SID;
  const password = process.env.TWILIO_AUTH_TOKEN;

  if (!username || !password) {
    return null;
  }

  return { username, password };
};

const downloadMedia = async (mediaUrl) => {
  const auth = getTwilioAuth();
  const response = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
    auth: auth || undefined,
    timeout: 15000,
  });

  return Buffer.from(response.data);
};

const extractTextFromImage = async (_buffer, metadata = {}) => {
  const fileLabel = metadata.fileName || metadata.mimeType || "image";

  return `OCR placeholder: extracted text from uploaded ${fileLabel}. Replace this placeholder with your OCR service integration when ready.`;
};

const detectMediaKind = (contentType = "") => {
  if (contentType.startsWith("image/")) {
    return "image";
  }

  if (contentType.startsWith("audio/")) {
    return "audio";
  }

  return "file";
};

module.exports = {
  detectMediaKind,
  downloadMedia,
  extractTextFromImage,
};
