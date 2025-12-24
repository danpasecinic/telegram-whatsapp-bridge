const {Client, LocalAuth, MessageMedia} = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const {config} = require('./config');
const log = require('./logger');

let isReady = false;
const messageMap = new Map();

const puppeteerConfig = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
};

if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

const authPath = process.env.DATA_DIR ? `${process.env.DATA_DIR}/wwebjs_auth` : undefined;

const client = new Client({
    authStrategy: new LocalAuth({dataPath: authPath}),
    puppeteer: puppeteerConfig
});

client.on('qr', (qr) => {
    log.info('Scan this QR code with WhatsApp:');
    qrcode.generate(qr, {small: true});
});

client.on('ready', async () => {
    log.info('WhatsApp client is ready');
    isReady = true;

    if (config.whatsapp.channelInvite && !config.whatsapp.chatId) {
        log.info('Resolving channel from invite code...');
        const channelId = await getChannelByInvite(config.whatsapp.channelInvite);
        if (channelId) {
            config.whatsapp.chatId = channelId;
            log.info('Add this to your .env: WHATSAPP_CHAT_ID=' + channelId);
        }
    }

    if (!config.whatsapp.chatId) {
        await listChats();
    }
});

client.on('authenticated', () => {
    log.info('WhatsApp authenticated');
});

client.on('auth_failure', (msg) => {
    log.error(`WhatsApp authentication failed: ${msg}`);
});

client.on('disconnected', (reason) => {
    log.warn(`WhatsApp disconnected: ${reason}`);
    isReady = false;
});

async function listChats() {
    const chats = await client.getChats();
    const groups = chats.filter(c => c.id._serialized.endsWith('@g.us'));

    log.info('--- WhatsApp Groups ---');
    groups.slice(0, 10).forEach(chat => {
        log.info(`${chat.name} | ${chat.id._serialized}`);
    });

    log.info('--- WhatsApp Channels ---');
    try {
        const channels = await client.getChannels();
        if (!channels || channels.length === 0) {
            log.info('No channels found.');
        } else {
            channels.forEach(channel => {
                log.info(`${channel.name} | ${channel.id._serialized}`);
            });
        }
    } catch (e) {
        log.warn('Could not fetch channels: ' + e.message);
    }

    log.info('Copy the desired ID to your .env file as WHATSAPP_CHAT_ID');
}

async function getChannelByInvite(inviteCode) {
    try {
        const channel = await client.getChannelByInviteCode(inviteCode);
        if (channel) {
            log.info(`Channel found: ${channel.name} | ${channel.id._serialized}`);
            return channel.id._serialized;
        }
    } catch (e) {
        log.error('Failed to get channel: ' + e.message);
    }
    return null;
}

function canSend() {
    if (!isReady) {
        log.warn('WhatsApp not ready, message skipped');
        return false;
    }
    if (!config.whatsapp.chatId) {
        log.warn('WHATSAPP_CHAT_ID not set, cannot forward message');
        return false;
    }
    return true;
}

async function getChat() {
    try {
        return await client.getChatById(config.whatsapp.chatId);
    } catch (e) {
        return null;
    }
}

async function sendMessage(text, telegramMsgId = null) {
    if (!canSend()) return false;

    try {
        const chat = await getChat();
        let msg;

        if (chat) msg = await chat.sendMessage(text);
        else msg = await client.sendMessage(config.whatsapp.chatId, text);

        if (telegramMsgId && msg) {
            messageMap.set(telegramMsgId, msg);
        }

        log.info('Message forwarded to WhatsApp');
        return true;
    } catch (error) {
        log.error(`Failed to forward message: ${error.message}`);
        return false;
    }
}

async function editMessage(text, telegramMsgId) {
    const msg = messageMap.get(telegramMsgId);
    if (!msg) {
        log.debug('No WhatsApp message found for edit, sending as new');
        return sendMessage(text, telegramMsgId);
    }

    try {
        await msg.edit(text);
        log.info('Message edited on WhatsApp');
        return true;
    } catch (error) {
        log.error(`Failed to edit message: ${error.message}`);
        return sendMessage(text, telegramMsgId);
    }
}

async function sendPhoto(url, caption = '') {
    if (!canSend()) return false;

    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const media = new MessageMedia('image/jpeg', base64, 'image.jpg');

        const options = caption ? {caption} : {};
        const chat = await getChat();

        if (chat) await chat.sendMessage(media, options);
        else await client.sendMessage(config.whatsapp.chatId, media, options);

        log.info('Photo forwarded to WhatsApp');
        return true;
    } catch (error) {
        log.error(`Failed to forward photo: ${error.message}`);
        if (caption) {
            log.warn('Falling back to text-only message');
            return sendMessage(caption);
        }
        return false;
    }
}

async function initialize() {
    log.info('Initializing WhatsApp client...');
    await client.initialize();
}

function destroy() {
    client.destroy();
}

module.exports = {initialize, sendMessage, editMessage, sendPhoto, destroy};
