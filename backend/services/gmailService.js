const { google } = require("googleapis");

async function fetchLatestEmails(auth, options = {}) {
  const gmail = google.gmail({ version: "v1", auth });
  const maxResults = Math.min(Number(options.maxResults) || 10, 25);
  const { data } = await gmail.users.messages.list({
    userId: "me",
    maxResults,
  });

  const messageIds = data.messages || [];

  const emails = await Promise.all(
    messageIds.map(async ({ id }) => {
      const { data: message } = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      });

      return {
        id: message.id,
        threadId: message.threadId,
        snippet: message.snippet || "",
        payload: message.payload || {},
        internalDate: message.internalDate,
      };
    })
  );

  return emails;
}

module.exports = {
  fetchLatestEmails,
};
