const {Telegraf} = require('telegraf');
const {config} = require('./config');
const whatsapp = require('./whatsapp');
const log = require('./logger');

const bot = new Telegraf(config.telegram.botToken);

const processedMediaGroups = new Set();

const isForwarded = (post) => post.forward_origin || post.forward_from || post.forward_from_chat;

const shouldProcess = (channelId) => !config.telegram.channelId || channelId === config.telegram.channelId;

async function getPhotoUrl(ctx, post) {
    if (!post.photo) return null;

    try {
        const fileId = post.photo[post.photo.length - 1].file_id;
        const fileUrl = await ctx.telegram.getFileLink(fileId);
        return fileUrl.href;
    } catch (error) {
        log.error(`Failed to get photo link: ${error.message}`);
        return null;
    }
}

async function processPost(ctx, post, isEdited = false) {
    const channelId = post.chat.id.toString();
    if (!shouldProcess(channelId)) return;
    if (isForwarded(post)) return log.debug('Skipping forwarded message');

    if (post.media_group_id) {
        if (processedMediaGroups.has(post.media_group_id)) {
            return log.debug('Skipping additional media from group');
        }
        processedMediaGroups.add(post.media_group_id);
        setTimeout(() => processedMediaGroups.delete(post.media_group_id), 60000);
    }

    const channelName = post.chat.title || 'Unknown Channel';
    const message = post.text || post.caption || '';
    const msgId = post.message_id;

    if (isEdited) {
        if (!message) {
            return log.debug(`Skipping media-only edit from ${channelName}`);
        }
        if (post.photo && !whatsapp.hadMedia(msgId)) {
            return log.debug(`Skipping edit with added media from ${channelName} (not supported)`);
        }
        log.info(`Edited message from ${channelName}`);
        return whatsapp.editMessage(message, msgId);
    }

    const photoUrl = await getPhotoUrl(ctx, post);
    if (photoUrl) {
        log.info(`New photo from ${channelName}`);
        return whatsapp.sendPhoto(photoUrl, message, msgId);
    }

    if (!message) {
        return log.debug(`Skipping media-only post from ${channelName}`);
    }

    log.info(`New message from ${channelName}: ${message.substring(0, 50)}...`);
    return whatsapp.sendMessage(message, msgId);
}

bot.on('channel_post', (ctx) => processPost(ctx, ctx.channelPost, false));
bot.on('edited_channel_post', (ctx) => processPost(ctx, ctx.editedChannelPost, true));

async function launch() {
    log.info('Starting Telegram bot...');
    await bot.launch();
    log.info('Telegram bot is running');
}

function stop(signal) {
    bot.stop(signal);
}

module.exports = {launch, stop};
