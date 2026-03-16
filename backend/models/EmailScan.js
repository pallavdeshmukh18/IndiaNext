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
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

module.exports = mongoose.model("EmailScan", emailScanSchema);
