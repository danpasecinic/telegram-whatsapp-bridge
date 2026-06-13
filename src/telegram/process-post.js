import { config } from "../config.js";
import log from "../logger.js";
import {
  sendMessage,
  editMessage,
  sendPhoto,
  sendVideo,
  hadMedia,
} from "../whatsapp/index.js";
import { shouldBlock } from "../filter.js";
import { formatMessage } from "./format-message.js";
import { getPhotoUrl, getVideoUrl } from "./media.js";

const processedMediaGroups = new Set();

/** @param {any} post */
const isForwarded = (post) =>
  post.forward_origin || post.forward_from || post.forward_from_chat;

/** @param {string} channelId */
const shouldProcess = (channelId) =>
  !config.telegram.channelId || channelId === config.telegram.channelId;

/**
 * Process a Telegram channel post and forward it to WhatsApp, honoring the
 * channel filter, forward/repost skipping, media-group de-duplication, and the
 * content filter.
 *
 * @param {import("telegraf").Context} ctx
 * @param {any} post
 * @param {boolean} [isEdited]
 */
export async function processPost(ctx, post, isEdited = false) {
  const channelId = post.chat.id.toString();
  if (!shouldProcess(channelId)) return;
  if (isForwarded(post)) return log.debug("Skipping forwarded message");

  if (post.media_group_id) {
    if (processedMediaGroups.has(post.media_group_id)) {
      return log.debug("Skipping additional media from group");
    }
    processedMediaGroups.add(post.media_group_id);
    setTimeout(() => processedMediaGroups.delete(post.media_group_id), 60000);
  }

  const channelName = post.chat.title || "Unknown Channel";
  const rawText = post.text || post.caption || "";
  const entities = post.text ? post.entities : post.caption_entities;

  if (shouldBlock(rawText, entities)) {
    return log.info(`Skipping filtered message from ${channelName}`);
  }

  const message = formatMessage(rawText, entities);
  const msgId = post.message_id;

  if (isEdited) {
    if (!message) {
      return log.debug(`Skipping media-only edit from ${channelName}`);
    }
    if ((post.photo || post.video) && !hadMedia(msgId)) {
      return log.debug(
        `Skipping edit with added media from ${channelName} (not supported)`,
      );
    }
    log.info(`Edited message from ${channelName}`);
    return editMessage(message, msgId);
  }

  const photoUrl = await getPhotoUrl(ctx, post);
  if (photoUrl) {
    log.info(`New photo from ${channelName}`);
    return sendPhoto(photoUrl, message, msgId);
  }

  const videoUrl = await getVideoUrl(ctx, post);
  if (videoUrl) {
    log.info(`New video from ${channelName}`);
    return sendVideo(videoUrl, message, msgId);
  }

  if (!message) {
    return log.debug(`Skipping media-only post from ${channelName}`);
  }

  log.info(`New message from ${channelName}: ${message.substring(0, 50)}...`);
  return sendMessage(message, msgId);
}
