const {Client, LocalAuth, MessageMedia} = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const {config} = require('./config');

let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('Scan this QR code with WhatsApp:');
    qrcode.generate(qr, {small: true});
});

client.on('ready', async () => {
    console.log('WhatsApp client is ready!');
    isReady = true;

    if (!config.whatsapp.chatId) {
        await listChats();
    }
});

client.on('authenticated', () => {
    console.log('WhatsApp authenticated');
});

client.on('auth_failure', (msg) => {
    console.error('WhatsApp authentication failed:', msg);
});

async function listChats() {
    console.log('\n--- Available WhatsApp Chats ---');
    const chats = await client.getChats();
    chats.slice(0, 20).forEach(chat => {
        console.log(`Name: ${chat.name} | ID: ${chat.id._serialized}`);
    });
    console.log('\nCopy the desired chat ID to your .env file as WHATSAPP_CHAT_ID\n');
}

function canSend() {
    if (!isReady) {
        console.log('WhatsApp not ready, message skipped');
        return false;
    }
    if (!config.whatsapp.chatId) {
        console.log('WHATSAPP_CHAT_ID not set, cannot forward message');
        return false;
    }
    return true;
}

async function sendMessage(text) {
    if (!canSend()) return false;

    try {
        await client.sendMessage(config.whatsapp.chatId, text);
        console.log('Message forwarded to WhatsApp');
        return true;
    } catch (error) {
        console.error('Failed to forward message:', error.message);
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
        console.log(`${type} forwarded to WhatsApp`);
        return true;
    } catch (error) {
        console.error('Failed to forward media:', error.message);
        if (caption) {
            console.log('Falling back to text-only message');
            return sendMessage(`${caption}\n\n[Media failed to load]`);
        }
        return false;
    }
}

async function initialize() {
    console.log('Initializing WhatsApp client...');
    await client.initialize();
}

function destroy() {
    client.destroy();
}

module.exports = {initialize, sendMessage, sendMedia, destroy};
