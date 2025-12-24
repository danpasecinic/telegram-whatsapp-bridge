const {Telegraf} = require('telegraf');
const {config} = require('./config');
const whatsapp = require('./whatsapp');
const log = require('./logger');

const bot = new Telegraf(config.telegram.botToken);

function isForwarded(post) {
    return post.forward_origin || post.forward_from || post.forward_from_chat;
}

function shouldProcess(channelId) {
    if (!config.telegram.channelId) return true;
    return channelId === config.telegram.channelId;
}

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

    if (isForwarded(post)) {
        log.debug('Skipping forwarded message');
        return;
    }

    const channelName = post.chat.title || 'Unknown Channel';
    const message = post.text || post.caption || '';
    const photoUrl = await getPhotoUrl(ctx, post);

    if (photoUrl) {
        log.info(`New photo from ${channelName}`);
        await whatsapp.sendPhoto(photoUrl, message);
    } else if (message) {
        log.info(`New message from ${channelName}: ${message.substring(0, 50)}...`);
        await whatsapp.sendMessage(message);
    } else {
        log.debug(`Skipping media-only post from ${channelName}`);
    }
}

bot.on('channel_post', async (ctx) => {
    await processPost(ctx, ctx.channelPost, false);
});

bot.on('edited_channel_post', async (ctx) => {
    await processPost(ctx, ctx.editedChannelPost, true);
});

async function launch() {
    log.info('Starting Telegram bot...');
    await bot.launch();
    log.info('Telegram bot is running');
}

function stop(signal) {
    bot.stop(signal);
}

module.exports = {launch, stop};
