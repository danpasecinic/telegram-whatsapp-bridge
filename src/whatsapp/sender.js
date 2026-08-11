import whatsappWeb from "whatsapp-web.js";
import { client, isReady } from "./client.js";

const { MessageMedia } = whatsappWeb;
import { config } from "../config.js";
import log from "../logger.js";
import { remember, getMessage } from "./message-store.js";

/** @returns {boolean} */
function canSend() {
  if (!isReady())
    return log.warn("WhatsApp not ready, message skipped") || false;
  if (!config.whatsapp.chatId)
    return log.warn("WHATSAPP_CHAT_ID not set") || false;
  return true;
}

async function getChat() {
  try {
    return await client.getChatById(config.whatsapp.chatId);
  } catch {
    return null;
  }
}

/**
 * @param {string|import("whatsapp-web.js").MessageMedia} content
 * @param {object} [options]
 */
async function send(content, options = {}) {
  const chat = await getChat();
  return chat
    ? chat.sendMessage(content, options)
    : client.sendMessage(config.whatsapp.chatId, content, options);
}

/**
 * @param {string} text
 * @param {number|null} [telegramMsgId]
 * @returns {Promise<boolean>}
 */
export async function sendMessage(text, telegramMsgId = null) {
  if (!canSend()) return false;

  try {
    const msg = await send(text);
    if (telegramMsgId && msg) remember(telegramMsgId, msg, false);
    log.info("Message forwarded to WhatsApp");
    return true;
  } catch (error) {
    log.error(`Failed to forward message: ${error.message}`);
    return false;
  }
}

/**
 * @param {string} text
 * @param {number} telegramMsgId
 * @returns {Promise<boolean>}
 */
export async function editMessage(text, telegramMsgId) {
  const msg = getMessage(telegramMsgId);

  if (!msg) {
    log.warn("No WhatsApp message found for edit, leaving the channel as is");
    return false;
  }

  try {
    // msg.edit() resolves null when WhatsApp rejects the edit
    const edited = await msg.edit(text);
    if (!edited) throw new Error("edit rejected");
    log.info("Message edited on WhatsApp");
    return true;
  } catch (error) {
    log.warn(`Failed to edit message, keeping the original: ${error.message}`);
    return false;
  }
}

/**
 * @param {string} url
 * @param {string} mimeType
 * @param {string} filename
 * @param {string} [caption]
 * @param {number|null} [telegramMsgId]
 */
async function sendMedia(
  url,
  mimeType,
  filename,
  caption = "",
  telegramMsgId = null,
) {
  if (!canSend()) return false;

  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const media = new MessageMedia(mimeType, base64, filename);

    const msg = await send(media, caption ? { caption } : {});
    if (telegramMsgId && msg) remember(telegramMsgId, msg, true);
    return msg;
  } catch (error) {
    log.error(`Failed to forward media: ${error.message}`);
    return null;
  }
}

/**
 * @param {string} url
 * @param {string} [caption]
 * @param {number|null} [telegramMsgId]
 * @returns {Promise<boolean>}
 */
export async function sendPhoto(url, caption = "", telegramMsgId = null) {
  const result = await sendMedia(
    url,
    "image/jpeg",
    "image.jpg",
    caption,
    telegramMsgId,
  );
  if (result) {
    log.info("Photo forwarded to WhatsApp");
    return true;
  }
  return caption ? sendMessage(caption, telegramMsgId) : false;
}

/**
 * @param {string} url
 * @param {string} [caption]
 * @param {number|null} [telegramMsgId]
 * @returns {Promise<boolean>}
 */
export async function sendVideo(url, caption = "", telegramMsgId = null) {
  const result = await sendMedia(
    url,
    "video/mp4",
    "video.mp4",
    caption,
    telegramMsgId,
  );
  if (result) {
    log.info("Video forwarded to WhatsApp");
    return true;
  }
  return caption ? sendMessage(caption, telegramMsgId) : false;
}
