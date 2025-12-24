const {Client, LocalAuth, MessageMedia} = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const {config} = require('./config');
const log = require('./logger');

let isReady = false;
const messageMap = new Map();

const puppeteerConfig = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    ...(process.env.PUPPETEER_EXECUTABLE_PATH && {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
    })
};

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
    await resolveChannelIfNeeded();
    if (!config.whatsapp.chatId) await listChats();
});

client.on('authenticated', () => log.info('WhatsApp authenticated'));
client.on('auth_failure', (msg) => log.error(`WhatsApp authentication failed: ${msg}`));
client.on('disconnected', (reason) => {
    log.warn(`WhatsApp disconnected: ${reason}`);
    isReady = false;
});

async function resolveChannelIfNeeded() {
    if (!config.whatsapp.channelInvite || config.whatsapp.chatId) return;

    log.info('Resolving channel from invite code...');
    const channelId = await getChannelByInvite(config.whatsapp.channelInvite);
    if (!channelId) return;

    config.whatsapp.chatId = channelId;
    log.info('Add this to your .env: WHATSAPP_CHAT_ID=' + channelId);
}

async function listChats() {
    const chats = await client.getChats();
    const groups = chats.filter(c => c.id._serialized.endsWith('@g.us'));

    log.info('--- WhatsApp Groups ---');
    groups.slice(0, 10).forEach(c => log.info(`${c.name} | ${c.id._serialized}`));

    log.info('--- WhatsApp Channels ---');
    try {
        const channels = await client.getChannels();
        if (channels?.length) {
            channels.forEach(c => log.info(`${c.name} | ${c.id._serialized}`));
        } else {
            log.info('No channels found.');
        }
    } catch (e) {
        log.warn('Could not fetch channels: ' + e.message);
    }

    log.info('Copy the desired ID to your .env file as WHATSAPP_CHAT_ID');
}

async function getChannelByInvite(inviteCode) {
    try {
        const channel = await client.getChannelByInviteCode(inviteCode);
        if (!channel) return null;
        log.info(`Channel found: ${channel.name} | ${channel.id._serialized}`);
        return channel.id._serialized;
    } catch (e) {
        log.error('Failed to get channel: ' + e.message);
        return null;
    }
}

function canSend() {
    if (!isReady) return log.warn('WhatsApp not ready, message skipped') || false;
    if (!config.whatsapp.chatId) return log.warn('WHATSAPP_CHAT_ID not set') || false;
    return true;
}

async function getChat() {
    try {
        return await client.getChatById(config.whatsapp.chatId);
    } catch {
        return null;
    }
}

async function send(content, options = {}) {
    const chat = await getChat();
    return chat
        ? chat.sendMessage(content, options)
        : client.sendMessage(config.whatsapp.chatId, content, options);
}

async function sendMessage(text, telegramMsgId = null) {
    if (!canSend()) return false;

    try {
        const msg = await send(text);
        if (telegramMsgId && msg) messageMap.set(telegramMsgId, msg);
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

        await send(media, caption ? {caption} : {});
        log.info('Photo forwarded to WhatsApp');
        return true;
    } catch (error) {
        log.error(`Failed to forward photo: ${error.message}`);
        return caption ? sendMessage(caption) : false;
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
