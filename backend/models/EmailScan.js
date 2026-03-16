const mongoose = require("mongoose");

const emailScanSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    subject: {
      type: String,
      default: "",
    },
    sender: {
      type: String,
      default: "",
    },
    body: {
      type: String,
      default: "",
    },
    snippet: {
      type: String,
      default: "",
    },
    links: {
      type: [String],
      default: [],
    },
    attachments: {
      type: [
        {
          filename: String,
          mimeType: String,
          size: Number,
          attachmentId: String,
        },
      ],
      default: [],
    },
    scamProbability: {
      type: Number,
      required: true,
    },
    riskScore: {
      type: Number,
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    explanation: {
      type: [String],
      default: [],
    },
    aiGeneratedAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    modelSource: {
      type: String,
      default: "ML/phishing_mail/phishing_model.pkl",
    },
    scoreBasis: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

module.exports = mongoose.model("EmailScan", emailScanSchema);
