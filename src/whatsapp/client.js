import whatsappWeb from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

const { Client, LocalAuth } = whatsappWeb;
import { config } from "../config.js";
import { sendAlert } from "../telegram/alert.js";
import log from "../logger.js";

let ready = false;
let reauthAlerted = false;

const puppeteerConfig = {
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
  ...(config.puppeteerExecutablePath && {
    executablePath: config.puppeteerExecutablePath,
  }),
};

const authPath = config.dataDir ? `${config.dataDir}/wwebjs_auth` : undefined;

export const client = new Client({
  authStrategy: new LocalAuth({ dataPath: authPath }),
  puppeteer: puppeteerConfig,
});

client.on("qr", (qr) => {
  log.info("Scan this QR code with WhatsApp:");
  qrcode.generate(qr, { small: true });
  if (!reauthAlerted) {
    reauthAlerted = true;
    sendAlert(
      "WhatsApp bridge needs re-authentication. Open the server logs and scan the QR code to restore the WhatsApp session.",
    );
  }
});

client.on("ready", () => {
  log.info("WhatsApp client is ready");
  ready = true;
  reauthAlerted = false;
});

client.on("authenticated", () => log.info("WhatsApp authenticated"));
client.on("auth_failure", (msg) => {
  log.error(`WhatsApp authentication failed: ${msg}`);
  sendAlert(`WhatsApp authentication failed: ${msg}`);
});
client.on("disconnected", (reason) => {
  log.warn(`WhatsApp disconnected: ${reason}`);
  ready = false;
  sendAlert(
    `WhatsApp bridge disconnected (${reason}). It will try to reconnect; a QR re-scan may be required.`,
  );
});

/** @returns {boolean} Whether the WhatsApp client is connected and ready. */
export const isReady = () => ready;

export async function initialize() {
  log.info("Initializing WhatsApp client...");
  await client.initialize();
}

export function destroy() {
  client.destroy();
}
