const { OAuth2Client } = require("google-auth-library");

let client = null;

const getGoogleClient = () => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
    }

    if (!client) {
        client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    }

    return client;
};

const verifyGoogleIdToken = async (idToken) => {
    const googleClient = getGoogleClient();
    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
    });

    return ticket.getPayload();
};

module.exports = {
    verifyGoogleIdToken
};
