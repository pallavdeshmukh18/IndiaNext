const mongoose = require("mongoose");

const ScanLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        inputType: {
            type: String,
            required: true
        },

        content: {
            type: String,
            required: true
        },

        prediction: {
            type: String,
            required: true
        },

        confidence: {
            type: Number,
            required: true
        },

        riskLevel: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH"],
            required: true
        },

        explanation: {
            type: [String],
            default: []
        },

        recommendations: {
            type: [String],
            default: []
        }

    },
    { timestamps: true }
);

module.exports = mongoose.model("ScanLog", ScanLogSchema);
