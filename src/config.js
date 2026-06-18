import "dotenv/config";
import * as z from "zod";

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  TELEGRAM_CHANNEL_ID: z.string().optional(),
  TELEGRAM_ALERT_CHAT_ID: z.string().optional(),
  WHATSAPP_CHAT_ID: z.string().optional(),
  WHATSAPP_CHANNEL_INVITE: z.string().optional(),
  LOG_DIR: z.string().min(1).default("./logs"),
  DATA_DIR: z.string().optional(),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  DEBUG: z.string().optional(),
});

/**
 * @typedef {object} Config
 * @property {{ botToken: string, channelId?: string, alertChatId?: string }} telegram
 * @property {{ chatId?: string, channelInvite?: string }} whatsapp
 * @property {string} logDir
 * @property {string|undefined} dataDir
 * @property {string|undefined} puppeteerExecutablePath
 * @property {boolean} debug
 */

/** @returns {Config} */
function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment configuration:");
    for (const issue of result.error.issues) {
      const path = issue.path.join(".") || "(root)";
      console.error(`  - ${path}: ${issue.message}`);
    }
    process.exit(1);
  }

  const env = result.data;

  return {
    telegram: {
      botToken: env.TELEGRAM_BOT_TOKEN,
      channelId: env.TELEGRAM_CHANNEL_ID || undefined,
      alertChatId: env.TELEGRAM_ALERT_CHAT_ID || undefined,
    },
    whatsapp: {
      chatId: env.WHATSAPP_CHAT_ID || undefined,
      channelInvite: env.WHATSAPP_CHANNEL_INVITE || undefined,
    },
    logDir: env.LOG_DIR,
    dataDir: env.DATA_DIR || undefined,
    puppeteerExecutablePath: env.PUPPETEER_EXECUTABLE_PATH || undefined,
    debug: Boolean(env.DEBUG),
  };
}

/** @type {Config} */
export const config = loadConfig();
