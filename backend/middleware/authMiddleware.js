const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({
            error: "Unauthorized"
        });
    }
};

const attachUserIfPresent = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next();
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select("-password");

        if (user) {
            req.user = user;
        }

        return next();
    } catch (_error) {
        return next();
    }
};

module.exports = {
    protect,
    attachUserIfPresent
};
