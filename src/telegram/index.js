import { Telegraf } from "telegraf";
import { config } from "../config.js";
import log from "../logger.js";
import { processPost } from "./process-post.js";

const bot = new Telegraf(config.telegram.botToken);

bot.on("channel_post", (ctx) => processPost(ctx, ctx.channelPost, false));
bot.on("edited_channel_post", (ctx) =>
  processPost(ctx, ctx.editedChannelPost, true),
);

export async function launch() {
  log.info("Starting Telegram bot...");
  await bot.launch();
  log.info("Telegram bot is running");
}

/** @param {string} signal */
export function stop(signal) {
  bot.stop(signal);
}
