import { Telegram } from "telegraf";
import { config } from "../config.js";
import log from "../logger.js";

const telegram = config.telegram.alertChatId
  ? new Telegram(config.telegram.botToken)
  : null;

const MAX_ALERT_LENGTH = 4000;
const REPEAT_WINDOW_MS = 10 * 60 * 1000;
const FLUSH_TIMEOUT_MS = 5000;

/** @type {Set<Promise<void>>} */
const pending = new Set();

/** @type {Map<string, number>} */
const lastAlertedAt = new Map();

/** @param {string} text */
async function deliver(text) {
  if (!telegram || !config.telegram.alertChatId) return;
  try {
    await telegram.sendMessage(
      config.telegram.alertChatId,
      text.slice(0, MAX_ALERT_LENGTH),
    );
  } catch (err) {
    log.warn(`Failed to send Telegram alert: ${err.message}`);
  }
}

/**
 * Send a direct message to the configured alert chat.
 * No-op when TELEGRAM_ALERT_CHAT_ID is unset.
 * @param {string} text
 * @returns {Promise<void>}
 */
export function sendAlert(text) {
  const delivery = deliver(text);
  pending.add(delivery);
  delivery.finally(() => pending.delete(delivery));
  return delivery;
}

/** @returns {Promise<unknown>} */
export function flushAlerts(timeoutMs = FLUSH_TIMEOUT_MS) {
  return Promise.race([
    Promise.allSettled([...pending]),
    new Promise((resolve) => setTimeout(resolve, timeoutMs).unref()),
  ]);
}

/**
 * @param {string} message
 * @param {number} now
 */
function alertedRecently(message, now) {
  const last = lastAlertedAt.get(message);
  return last !== undefined && now - last < REPEAT_WINDOW_MS;
}

export function alertOnErrors() {
  log.onError((message) => {
    const now = Date.now();
    if (alertedRecently(message, now)) return;
    lastAlertedAt.set(message, now);
    sendAlert(`WhatsApp bridge error: ${message}`);
  });
}
