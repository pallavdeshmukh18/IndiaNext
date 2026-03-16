require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const os = require("os");
const twilio = require("twilio");

const app = express();
const threatRoutes = require("./routes/threatRoutes");
const historyRoutes = require("./routes/historyRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const alertRoutes = require("./routes/alertRoutes");
const authRoutes = require("./routes/authRoutes");
const { sendInteractiveMessage } = require("./bot/twilioInteractive");
const { handleIncomingWhatsappMessage } = require("./bot/whatsappBot");
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

app.use("/api/auth", authRoutes);
app.use("/api/threats", threatRoutes);
app.use("/api", historyRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", alertRoutes);

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



// MongoDB connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Mongo connected");
    })
    .catch((err) => {
        console.error("Mongo connection error:", err);
    });

// test route
app.get("/", (req, res) => {
    res.send("Backend running 🚀");
});

app.listen(PORT, () => {
    const networkInterfaces = os.networkInterfaces();
    let networkIP = "localhost";

    for (const name of Object.keys(networkInterfaces)) {
        for (const net of networkInterfaces[name]) {
            if (net.family === "IPv4" && !net.internal) {
                networkIP = net.address;
            }
        }
    }

    console.log("🚀 Backend running on:");
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://${networkIP}:${PORT}`);
});
