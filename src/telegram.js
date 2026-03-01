const { Telegraf } = require("telegraf");
const { config } = require("./config");
const whatsapp = require("./whatsapp").default;
const log = require("./logger");

const bot = new Telegraf(config.telegram.botToken);

const processedMediaGroups = new Set();

const entityFormatters = {
  bold: (text) => `*${text}*`,
  italic: (text) => `_${text}_`,
  strikethrough: (text) => `~${text}~`,
  code: (text) => `\`${text}\``,
  pre: (text) => `\`\`\`${text}\`\`\``,
  text_link: (text, entity) => `${text} (${entity.url})`,
  blockquote: (text) =>
    text
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n"),
};

function formatMessage(text, entities) {
  if (!text || !entities?.length) return text;

  const sorted = [...entities].sort((a, b) => b.offset - a.offset);
  let result = text;

  for (const entity of sorted) {
    const formatter = entityFormatters[entity.type];
    if (!formatter) continue;

    const start = entity.offset;
    const end = entity.offset + entity.length;
    const segment = result.substring(start, end);
    result =
      result.substring(0, start) +
      formatter(segment, entity) +
      result.substring(end);
  }

  return result;
}

const isForwarded = (post) =>
  post.forward_origin || post.forward_from || post.forward_from_chat;

const shouldProcess = (channelId) =>
  !config.telegram.channelId || channelId === config.telegram.channelId;

async function getFileUrl(ctx, fileId, type) {
  try {
    const fileUrl = await ctx.telegram.getFileLink(fileId);
    return fileUrl.href;
  } catch (error) {
    log.error(`Failed to get ${type} link: ${error.message}`);
    return null;
  }
}

async function getPhotoUrl(ctx, post) {
  if (!post.photo) return null;
  const fileId = post.photo[post.photo.length - 1].file_id;
  return getFileUrl(ctx, fileId, "photo");
}

async function getVideoUrl(ctx, post) {
  if (!post.video) return null;
  return getFileUrl(ctx, post.video.file_id, "video");
}

async function processPost(ctx, post, isEdited = false) {
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
  const message = formatMessage(rawText, entities);
  const msgId = post.message_id;

  if (isEdited) {
    if (!message) {
      return log.debug(`Skipping media-only edit from ${channelName}`);
    }
    if ((post.photo || post.video) && !whatsapp.hadMedia(msgId)) {
      return log.debug(
        `Skipping edit with added media from ${channelName} (not supported)`,
      );
    }
    log.info(`Edited message from ${channelName}`);
    return whatsapp.editMessage(message, msgId);
  }

  const photoUrl = await getPhotoUrl(ctx, post);
  if (photoUrl) {
    log.info(`New photo from ${channelName}`);
    return whatsapp.sendPhoto(photoUrl, message, msgId);
  }

  const videoUrl = await getVideoUrl(ctx, post);
  if (videoUrl) {
    log.info(`New video from ${channelName}`);
    return whatsapp.sendVideo(videoUrl, message, msgId);
  }

  if (!message) {
    return log.debug(`Skipping media-only post from ${channelName}`);
  }

  log.info(`New message from ${channelName}: ${message.substring(0, 50)}...`);
  return whatsapp.sendMessage(message, msgId);
}

bot.on("channel_post", (ctx) => processPost(ctx, ctx.channelPost, false));
bot.on("edited_channel_post", (ctx) =>
  processPost(ctx, ctx.editedChannelPost, true),
);

async function launch() {
  log.info("Starting Telegram bot...");
  await bot.launch();
  log.info("Telegram bot is running");
}

function stop(signal) {
  bot.stop(signal);
}

module.exports = { launch, stop };
