require('dotenv').config();

const config = {
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        channelId: process.env.TELEGRAM_CHANNEL_ID
    },
    whatsapp: {
        chatId: process.env.WHATSAPP_CHAT_ID
    }
};

function validate() {
    if (!config.telegram.botToken) {
        console.error('TELEGRAM_BOT_TOKEN is required');
        process.exit(1);
    }
}

module.exports = {config, validate};
