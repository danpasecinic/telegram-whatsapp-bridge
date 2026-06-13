import { config } from "../config.js";
import { client, initialize, destroy } from "./client.js";
import { resolveChannelIfNeeded, listChats } from "./channel.js";
import { hadMedia } from "./message-store.js";
import { sendMessage, editMessage, sendPhoto, sendVideo } from "./sender.js";

client.on("ready", async () => {
  await resolveChannelIfNeeded();
  if (!config.whatsapp.chatId) await listChats();
});

export {
  initialize,
  destroy,
  hadMedia,
  sendMessage,
  editMessage,
  sendPhoto,
  sendVideo,
};
