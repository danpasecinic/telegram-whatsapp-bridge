const {Client, LocalAuth, MessageMedia} = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const {config} = require('./config');
const log = require('./logger');

let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    log.info('Scan this QR code with WhatsApp:');
    qrcode.generate(qr, {small: true});
});

client.on('ready', async () => {
    log.info('WhatsApp client is ready');
    isReady = true;

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
    log.info('--- Available WhatsApp Chats ---');
    const chats = await client.getChats();
    chats.slice(0, 20).forEach(chat => {
        log.info(`Name: ${chat.name} | ID: ${chat.id._serialized}`);
    });
    log.info('Copy the desired chat ID to your .env file as WHATSAPP_CHAT_ID');
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

async function sendMessage(text) {
    if (!canSend()) return false;

    try {
        await client.sendMessage(config.whatsapp.chatId, text);
        log.info('Message forwarded to WhatsApp');
        return true;
    } catch (error) {
        log.error(`Failed to forward message: ${error.message}`);
        return false;
    }
}

async function sendMedia(url, type, caption = '') {
    if (!canSend()) return false;

    try {
        const media = await MessageMedia.fromUrl(url, {unsafeMime: true});

        const options = {};
        if (caption) options.caption = caption;
        if (type === 'voice') options.sendAudioAsVoice = true;
        if (type === 'video' && url.includes('.gif')) options.sendVideoAsGif = true;

        await client.sendMessage(config.whatsapp.chatId, media, options);
        log.info(`${type} forwarded to WhatsApp`);
        return true;
    } catch (error) {
        log.error(`Failed to forward media: ${error.message}`);
        if (caption) {
            log.warn('Falling back to text-only message');
            return sendMessage(`${caption}\n\n[Media failed to load]`);
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

module.exports = {initialize, sendMessage, sendMedia, destroy};
