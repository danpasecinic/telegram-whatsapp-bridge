import { client } from "./client.js";
import { config } from "../config.js";
import log from "../logger.js";

/**
 * @param {string} inviteCode
 * @returns {Promise<string|null>} The resolved channel id, or null on failure.
 */
async function getChannelByInvite(inviteCode) {
  try {
    const channel = await client.getChannelByInviteCode(inviteCode);
    if (!channel) return null;
    log.info(`Channel found: ${channel.name} | ${channel.id._serialized}`);
    return channel.id._serialized;
  } catch (e) {
    log.error("Failed to get channel: " + e.message);
    return null;
  }
}

/**
 * Resolve the target chat id from a channel invite code when no explicit
 * WHATSAPP_CHAT_ID was provided. Mutates the runtime config on success.
 */
export async function resolveChannelIfNeeded() {
  if (!config.whatsapp.channelInvite || config.whatsapp.chatId) return;

  log.info("Resolving channel from invite code...");
  const channelId = await getChannelByInvite(config.whatsapp.channelInvite);
  if (!channelId) return;

  config.whatsapp.chatId = channelId;
  log.info("Add this to your .env: WHATSAPP_CHAT_ID=" + channelId);
}

/**
 * Log the available WhatsApp groups and channels so the operator can pick the
 * target chat id for their .env file.
 */
export async function listChats() {
  const chats = await client.getChats();
  const groups = chats.filter((c) => c.id._serialized.endsWith("@g.us"));

  log.info("--- WhatsApp Groups ---");
  groups
    .slice(0, 10)
    .forEach((c) => log.info(`${c.name} | ${c.id._serialized}`));

  log.info("--- WhatsApp Channels ---");
  try {
    const channels = await client.getChannels();
    if (channels?.length) {
      channels.forEach((c) => log.info(`${c.name} | ${c.id._serialized}`));
    } else {
      log.info("No channels found.");
    }
  } catch (e) {
    log.warn("Could not fetch channels: " + e.message);
  }

  log.info("Copy the desired ID to your .env file as WHATSAPP_CHAT_ID");
}
