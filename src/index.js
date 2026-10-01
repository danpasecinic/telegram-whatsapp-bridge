import "./config.js";
import * as telegram from "./telegram/index.js";
import * as whatsapp from "./whatsapp/index.js";
import { alertOnErrors, flushAlerts } from "./telegram/alert.js";
import log from "./logger.js";

alertOnErrors();

async function start() {
  log.info("Starting Telegram-WhatsApp Bridge...");
  await whatsapp.initialize();
  await telegram.launch();
  log.info("Bridge is running! Listening for Telegram channel messages...");
}

/** @param {string} signal */
function shutdown(signal) {
  log.info(`Received ${signal}, shutting down...`);
  telegram.stop(signal);
  whatsapp.destroy();
  process.exit(0);
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
/** @param {string} message */
async function crash(message) {
  log.error(message);
  await flushAlerts();
  process.exit(1);
}

process.on("unhandledRejection", (reason) =>
  crash(`Unhandled rejection: ${reason?.stack ?? reason}`),
);
process.on("uncaughtException", (err) =>
  crash(`Uncaught exception: ${err.stack ?? err.message}`),
);

start().catch((err) => crash(`Failed to start bridge: ${err.message}`));
