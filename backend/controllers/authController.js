const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { verifyGoogleIdToken } = require("../utils/verifyGoogleToken");

const buildAuthResponse = (user) => ({
    userId: user._id,
    name: user.name,
    email: user.email,
    authProvider: user.authProvider,
    avatar: user.avatar || "",
    token: generateToken(user._id)
});

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: "Name, email, and password are required"
            });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
            return res.status(400).json({
                error: "User already exists"
            });
        }

        const user = await User.create({
            name,
            email,
            password
        });

        res.status(201).json(buildAuthResponse(user));
    } catch (error) {
        res.status(500).json({
            error: "Failed to register user"
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        res.json(buildAuthResponse(user));
    } catch (error) {
        res.status(500).json({
            error: "Failed to log in user"
        });
    }
};

const googleAuth = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                error: "Google ID token is required"
            });
        }

        const payload = await verifyGoogleIdToken(idToken);

        if (!payload.email) {
            return res.status(400).json({
                error: "Google account email is required"
            });
        }

        let user = null;

        if (payload.sub) {
            user = await User.findOne({ googleId: payload.sub });
        }

        if (!user) {
            user = await User.findOne({ email: payload.email.toLowerCase() });
        }

        if (!user) {
            user = await User.create({
                name: payload.name || payload.email.split("@")[0],
                email: payload.email,
                googleId: payload.sub,
                authProvider: "google",
                avatar: payload.picture || ""
            });
        } else {
            user.name = payload.name || user.name;
            user.googleId = payload.sub || user.googleId;
            user.authProvider = "google";
            user.avatar = payload.picture || user.avatar;
            await user.save();
        }

        res.json(buildAuthResponse(user));
    } catch (error) {
        const statusCode = error.message === "GOOGLE_OAUTH_NOT_CONFIGURED" ? 500 : 401;

        res.status(statusCode).json({
            error: statusCode === 500
                ? "Google OAuth is not configured"
                : "Invalid Google token"
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    googleAuth
};
