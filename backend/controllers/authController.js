const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const buildAuthResponse = (user) => ({
    userId: user._id,
    name: user.name,
    email: user.email,
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

module.exports = {
    registerUser,
    loginUser
};
