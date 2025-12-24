# Telegram → WhatsApp Bridge

Forward posts from Telegram channels to WhatsApp (group or channel). Supports text, photos, videos, documents, and
audio. Automatically skips reposts/forwards from other channels.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```

3. **Get Telegram Bot Token**
    - Message [@BotFather](https://t.me/BotFather) → `/newbot`
    - Add bot as admin to your Telegram channel
    - Copy token to `.env`

4. **Run the bridge**
   ```bash
   npm start
   ```

5. **Connect WhatsApp**
    - Scan QR code with WhatsApp
    - Copy desired chat ID from console to `.env`
    - Restart

## Docker

```bash
# Build and run
docker compose up -d

# View logs
docker compose logs -f

# First run - get QR code
docker compose logs -f bridge
```

Session and logs persist in `./data/` directory.

## Environment Variables

| Variable              | Description                                                                 |
|-----------------------|-----------------------------------------------------------------------------|
| `TELEGRAM_BOT_TOKEN`  | Bot token from @BotFather                                                   |
| `TELEGRAM_CHANNEL_ID` | Channel ID to monitor (optional, monitors all if empty)                     |
| `WHATSAPP_CHAT_ID`    | Target WhatsApp chat (`123@g.us` for groups, `123@newsletter` for channels) |
| `LOG_DIR`             | Log directory (default: `./logs`)                                           |
| `DEBUG`               | Enable debug logging (set to `1`)                                           |

## Notes

- For WhatsApp Channels, your account must be an admin
- Session persists in `.wwebjs_auth/` folder
- Large files may fail due to Telegram API limits (20MB for bots)
