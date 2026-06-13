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

## Development

Plain JavaScript (ESM, Node 18+), no build step.

```bash
npm test          # run unit tests (node:test)
npm run lint      # eslint
npm run format    # prettier --write
```

Source layout:

- `src/config.js` — environment config, validated with zod
- `src/logger.js` — file + console logger
- `src/filter.js` — rules for messages that must not be forwarded
- `src/telegram/` — bot wiring, post processing, formatting, media helpers
- `src/whatsapp/` — client lifecycle, channel resolution, message store, sender

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

## Deploy

### On-demand (local script)

Deploy your current working tree to EC2 without going through `main`:

```bash
cp scripts/.env.deploy.example scripts/.env.deploy   # fill in EC2_HOST etc.
scripts/deploy.sh                                     # add -y to skip the prompt
```

The script rsyncs the build files to the box, rebuilds the image, and restarts
the container. It preserves the server's `.env` and `data/` but wipes the
WhatsApp session, so a fresh QR scan is required after each deploy. `.env.deploy`
is gitignored.

### Automatic (push to `main`)

Pushing to `main` triggers deployment to EC2 via GitHub Actions.

**Required GitHub Secrets:**

| Secret        | Description                           |
| ------------- | ------------------------------------- |
| `EC2_HOST`    | EC2 instance IP or hostname           |
| `EC2_SSH_KEY` | Private SSH key for `ec2-user` access |

## Environment Variables

| Variable              | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`  | Bot token from @BotFather                                                   |
| `TELEGRAM_CHANNEL_ID` | Channel ID to monitor (optional, monitors all if empty)                     |
| `WHATSAPP_CHAT_ID`    | Target WhatsApp chat (`123@g.us` for groups, `123@newsletter` for channels) |
| `LOG_DIR`             | Log directory (default: `./logs`)                                           |
| `DATA_DIR`            | Data directory for WhatsApp session (default: `.`)                          |
| `DEBUG`               | Enable debug logging (set to `1`)                                           |

## Notes

- For WhatsApp Channels, your account must be an admin
- Session persists in `.wwebjs_auth/` folder
- Large files may fail due to Telegram API limits (20MB for bots)
