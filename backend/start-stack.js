require("dotenv").config();

const { spawn } = require("child_process");
const path = require("path");

const PYTHON_BIN = process.env.PYTHON_BIN || "python";
const START_TELEGRAM_BOT = String(process.env.START_TELEGRAM_BOT || "true").toLowerCase() !== "false";
const children = [];
let shuttingDown = false;

function terminateChild(child) {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  child.kill("SIGTERM");
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    terminateChild(child);
  }

  setTimeout(() => {
    process.exit(code);
  }, 300);
}

function wireChild(name, child) {
  children.push(child);

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`${name} exited with ${reason}`);
    shutdown(code || 1);
  });

  child.on("error", (error) => {
    if (shuttingDown) {
      return;
    }

    console.error(`Failed to start ${name}: ${error.message}`);
    shutdown(1);
  });
}

const server = spawn(process.execPath, [path.join(__dirname, "server.js")], {
  cwd: __dirname,
  stdio: "inherit",
  env: process.env,
});

wireChild("backend server", server);

if (START_TELEGRAM_BOT) {
  const bot = spawn(PYTHON_BIN, [path.join(__dirname, "telebot.py")], {
    cwd: __dirname,
    stdio: "inherit",
    env: process.env,
  });

  wireChild("telegram bot", bot);
} else {
  console.log("Telegram bot auto-start disabled via START_TELEGRAM_BOT=false");
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
