require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const os = require("os");

const app = express();
const threatRoutes = require("./routes/threatRoutes");
const historyRoutes = require("./routes/historyRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const alertRoutes = require("./routes/alertRoutes");
const authRoutes = require("./routes/authRoutes");
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

app.use("/api/auth", authRoutes);
app.use("/api/threats", threatRoutes);
app.use("/api", historyRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", alertRoutes);

const twilio = require("twilio");

app.post("/whatsapp", express.urlencoded({ extended: false }), (req, res) => {

    console.log("BODY RECEIVED:", req.body);

    const msg = req.body.Body;

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("🤖 Scam scanner received: " + msg);

    res.type("text/xml");
    res.send(twiml.toString());
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
