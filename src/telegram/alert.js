import { Telegram } from "telegraf";
import { config } from "../config.js";
import log from "../logger.js";

const telegram = config.telegram.alertChatId
  ? new Telegram(config.telegram.botToken)
  : null;

/**
 * Send a direct message to the configured alert chat.
 * No-op when TELEGRAM_ALERT_CHAT_ID is unset.
 * @param {string} text
 */
export async function sendAlert(text) {
  if (!telegram || !config.telegram.alertChatId) return;
  try {
    await telegram.sendMessage(config.telegram.alertChatId, text);
  } catch (err) {
    log.error(`Failed to send Telegram alert: ${err.message}`);
  }
}
