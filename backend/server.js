require("dotenv").config();

const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
const twilio = require("twilio");

const alertRoutes = require("./routes/alertRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const authRoutes = require("./routes/auth");
const legacyAuthRoutes = require("./routes/authRoutes");
const { sendInteractiveMessage } = require("./bot/twilioInteractive");
const { handleIncomingWhatsappMessage } = require("./bot/whatsappBot");
const historyRoutes = require("./routes/historyRoutes");
const scanRoutes = require("./routes/scan");
const threatRoutes = require("./routes/threatRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "0.0.0.0";
const canStartWithoutDb = process.env.ALLOW_START_WITHOUT_DB === "true"
  || process.env.NODE_ENV !== "production";

let serverStarted = false;

function startServer() {
  if (serverStarted) {
    return;
  }

  serverStarted = true;
  app.listen(PORT, HOST, () => {
    console.log(`Scamurai backend listening on http://${HOST}:${PORT}`);
  });
}

app.use(cors());
app.use(express.json({ limit: "12mb" }));

app.post("/whatsapp", express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const botResponse = await handleIncomingWhatsappMessage(req.body);
    const sentInteractive = botResponse.interactive
      ? await sendInteractiveMessage({
        to: req.body.From,
        interactive: botResponse.interactive,
      })
      : false;
    const twiml = new twilio.twiml.MessagingResponse();

    if (!sentInteractive || botResponse.sendTextAlongsideInteractive) {
      twiml.message(botResponse.message);
    }

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

startServer();

mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  })
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB:", error.message);
    if (error.message.includes("querySrv")) {
      console.error("MongoDB Atlas SRV lookup failed. Use a non-SRV mongodb:// replica set URI in backend/.env.");
    }
    if (canStartWithoutDb) {
      console.warn("Running without MongoDB connection (degraded mode). Set ALLOW_START_WITHOUT_DB=false to keep fail-fast behavior.");
      return;
    }

    console.error("MongoDB is required in this environment. Process will keep serving while DB-dependent routes may fail.");
  });
