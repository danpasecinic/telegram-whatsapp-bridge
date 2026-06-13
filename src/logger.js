import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

const LOG_FILE = path.join(config.logDir, "bridge.log");

if (!fs.existsSync(config.logDir)) {
  fs.mkdirSync(config.logDir, { recursive: true });
}

function timestamp() {
  return new Date().toISOString();
}

/**
 * @param {string} level
 * @param {string} message
 * @returns {string}
 */
function formatMessage(level, message) {
  return `[${timestamp()}] [${level}] ${message}`;
}

/** @param {string} formatted */
function writeToFile(formatted) {
  fs.appendFileSync(LOG_FILE, formatted + "\n");
}

/** @param {string} message */
function info(message) {
  const formatted = formatMessage("INFO", message);
  console.log(formatted);
  writeToFile(formatted);
}

/** @param {string} message */
function error(message) {
  const formatted = formatMessage("ERROR", message);
  console.error(formatted);
  writeToFile(formatted);
}

/** @param {string} message */
function warn(message) {
  const formatted = formatMessage("WARN", message);
  console.warn(formatted);
  writeToFile(formatted);
}

/** @param {string} message */
function debug(message) {
  if (config.debug) {
    const formatted = formatMessage("DEBUG", message);
    console.log(formatted);
    writeToFile(formatted);
  }
}

export default { info, error, warn, debug };
