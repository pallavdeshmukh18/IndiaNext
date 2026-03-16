const twilio = require("twilio");

const CONTENT_SID_BY_TEMPLATE = {
  main_menu: process.env.TWILIO_CONTENT_SID_MAIN_MENU,
  input_menu: process.env.TWILIO_CONTENT_SID_INPUT_MENU,
  rescan_menu: process.env.TWILIO_CONTENT_SID_RESCAN_MENU,
};

const hasTwilioClientConfig = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

const getTwilioClient = () => {
  if (!hasTwilioClientConfig()) {
    return null;
  }

  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
};

const getMessageTarget = () => {
  // For WhatsApp, a direct approved sender is the most reliable option.
  // Twilio's Content API can send with From alone, and this avoids
  // Messaging Service sender-pool issues like error 21703.
  if (process.env.TWILIO_WHATSAPP_FROM) {
    return {
      from: process.env.TWILIO_WHATSAPP_FROM,
    };
  }

  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    return {
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    };
  }

  return null;
};

const sendInteractiveMessage = async ({ to, interactive }) => {
  const client = getTwilioClient();
  const target = getMessageTarget();
  const contentSid = CONTENT_SID_BY_TEMPLATE[interactive.template];

  if (!client || !target || !contentSid) {
    return false;
  }

  const messagePayload = {
    to,
    contentSid,
    ...target,
  };

  if (interactive.variables && Object.keys(interactive.variables).length > 0) {
    messagePayload.contentVariables = JSON.stringify(interactive.variables);
  }

  try {
    await client.messages.create(messagePayload);
  } catch (error) {
    console.error(
      "Twilio interactive send failed:",
      JSON.stringify({
        template: interactive.template,
        status: error.status,
        code: error.code,
        message: error.message,
        moreInfo: error.moreInfo,
      })
    );

    return false;
  }

  return true;
};

module.exports = {
  sendInteractiveMessage,
};
