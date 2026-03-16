require("dotenv").config();

const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const twilio = require("twilio");

const alertRoutes = require("./routes/alertRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const authRoutes = require("./routes/auth");
const legacyAuthRoutes = require("./routes/authRoutes");
const { handleIncomingWhatsappMessage } = require("./bot/whatsappBot");
const historyRoutes = require("./routes/historyRoutes");
const scanRoutes = require("./routes/scan");
const threatRoutes = require("./routes/threatRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 8000;

app.use(cors());
app.use(express.json());

app.post("/whatsapp", express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const botResponse = await handleIncomingWhatsappMessage(req.body);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(botResponse.message);

    res.type("text/xml");
    res.send(twiml.toString());
  } catch (error) {
    console.error("WhatsApp bot error:", error.message);

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(
      "Krypton could not complete that scan right now. Please try again in a moment or reply with MENU to restart."
    );

    res.type("text/xml");
    res.status(200).send(twiml.toString());
  }
});

app.get("/", (_req, res) => {
  res.json({
    service: "Scamurai backend",
    status: "ok",
    endpoints: {
      googleAuth: "/auth/google",
      scan: "/scan",
      quickAnalyze: "/api/threats/quick-analyze",
      analyze: "/api/threats/analyze",
    },
  });
});

app.use("/auth", authRoutes);
app.use("/scan", scanRoutes);
app.use("/api/auth", legacyAuthRoutes);
app.use("/api/threats", threatRoutes);
app.use("/api", historyRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", alertRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log(`Scamurai backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  });
