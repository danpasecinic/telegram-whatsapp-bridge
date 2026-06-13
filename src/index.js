import "./config.js";
import * as telegram from "./telegram/index.js";
import * as whatsapp from "./whatsapp/index.js";
import log from "./logger.js";

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

start().catch((err) => {
  log.error(`Failed to start bridge: ${err.message}`);
  process.exit(1);
});
