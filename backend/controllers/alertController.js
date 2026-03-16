const { getHighRiskAlerts } = require("../services/alertService");

const fetchAlerts = async (req, res) => {

    try {

        const alerts = await getHighRiskAlerts(req.user._id);

        res.json({
            success: true,
            count: alerts.length,
            alerts
        });

    } catch (error) {

        res.status(500).json({
            error: "Failed to fetch alerts"
        });

    }

};

module.exports = {
    fetchAlerts
};
