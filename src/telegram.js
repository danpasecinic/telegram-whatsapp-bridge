const {Telegraf} = require('telegraf');
const {config} = require('./config');
const whatsapp = require('./whatsapp');

const bot = new Telegraf(config.telegram.botToken);

function isForwarded(post) {
    return post.forward_origin || post.forward_from || post.forward_from_chat;
}

function shouldProcess(channelId) {
    if (!config.telegram.channelId) return true;
    return channelId === config.telegram.channelId;
}

function formatHeader(channelName, isEdited = false) {
    const editedTag = isEdited ? ' (edited)' : '';
    return `*${channelName}*${editedTag}`;
}

async function getMediaInfo(ctx, post) {
    let fileId = null;
    let type = null;

    if (post.photo) {
        fileId = post.photo[post.photo.length - 1].file_id;
        type = 'photo';
    } else if (post.video) {
        fileId = post.video.file_id;
        type = 'video';
    } else if (post.document) {
        fileId = post.document.file_id;
        type = 'document';
    } else if (post.audio) {
        fileId = post.audio.file_id;
        type = 'audio';
    } else if (post.voice) {
        fileId = post.voice.file_id;
        type = 'voice';
    } else if (post.video_note) {
        fileId = post.video_note.file_id;
        type = 'video';
    } else if (post.animation) {
        fileId = post.animation.file_id;
        type = 'video';
    }

    if (!fileId) return null;

    try {
        const fileUrl = await ctx.telegram.getFileLink(fileId);
        return {url: fileUrl.href, type};
    } catch (error) {
        console.error('Failed to get file link:', error.message);
        return null;
    }
}

async function processPost(ctx, post, isEdited = false) {
    const channelId = post.chat.id.toString();

    if (!shouldProcess(channelId)) return;

    if (isForwarded(post)) {
        console.log('Skipping forwarded message');
        return;
    }

    const channelName = post.chat.title || 'Unknown Channel';
    const header = formatHeader(channelName, isEdited);
    const caption = post.text || post.caption || '';
    const fullMessage = caption ? `${header}\n\n${caption}` : header;

    const media = await getMediaInfo(ctx, post);

    if (media) {
        console.log(`New ${media.type} from ${channelName}`);
        await whatsapp.sendMedia(media.url, media.type, fullMessage);
    } else if (caption) {
        console.log(`New message from ${channelName}: ${caption.substring(0, 50)}...`);
        await whatsapp.sendMessage(fullMessage);
    }
}

bot.on('channel_post', async (ctx) => {
    await processPost(ctx, ctx.channelPost, false);
});

bot.on('edited_channel_post', async (ctx) => {
    await processPost(ctx, ctx.editedChannelPost, true);
});

async function launch() {
    console.log('Starting Telegram bot...');
    await bot.launch();
    console.log('Telegram bot is running!');
}

function stop(signal) {
    bot.stop(signal);
}

module.exports = {launch, stop};
