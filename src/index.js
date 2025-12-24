const {validate} = require('./config');
const telegram = require('./telegram');
const whatsapp = require('./whatsapp');

validate();

async function start() {
    console.log('Starting Telegram-WhatsApp Bridge...\n');
    await whatsapp.initialize();
    await telegram.launch();
    console.log('\nBridge is running! Listening for Telegram channel messages...');
}

function shutdown(signal) {
    console.log(`\nReceived ${signal}, shutting down...`);
    telegram.stop(signal);
    whatsapp.destroy();
    process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

start().catch(err => {
    console.error('Failed to start bridge:', err);
    process.exit(1);
});
