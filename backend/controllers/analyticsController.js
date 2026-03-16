const {
    getAnalytics,
    getThreatTrends
} = require("../services/analyticsService");

const { getThreatTypes } = require("../services/analyticsService");

const fetchThreatTypes = async (req, res) => {

    try {

        const threats = await getThreatTypes(req.user._id);

        res.json({
            success: true,
            data: threats
        });

    } catch (error) {

        res.status(500).json({
            error: "Failed to fetch threat types"
        });

    }

};

const fetchAnalytics = async (req, res) => {
    try {

        const analytics = await getAnalytics(req.user._id);

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {

        res.status(500).json({
            error: "Failed to fetch analytics"
        });

    }
};

const fetchThreatTrends = async (req, res) => {

    try {

        const trends = await getThreatTrends(req.user._id);

        res.json({
            success: true,
            data: trends
        });

    } catch (error) {

        res.status(500).json({
            error: "Failed to fetch threat trends"
        });

    }

};

module.exports = {
    fetchAnalytics,
    fetchThreatTrends,
    fetchThreatTypes
};
