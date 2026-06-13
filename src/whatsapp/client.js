import whatsappWeb from "whatsapp-web.js";
import qrcode from "qrcode-terminal";

const { Client, LocalAuth } = whatsappWeb;
import { config } from "../config.js";
import log from "../logger.js";

let ready = false;

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
});

client.on("ready", () => {
  log.info("WhatsApp client is ready");
  ready = true;
});

client.on("authenticated", () => log.info("WhatsApp authenticated"));
client.on("auth_failure", (msg) =>
  log.error(`WhatsApp authentication failed: ${msg}`),
);
client.on("disconnected", (reason) => {
  log.warn(`WhatsApp disconnected: ${reason}`);
  ready = false;
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
