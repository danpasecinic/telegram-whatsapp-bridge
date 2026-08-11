import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.TELEGRAM_ALERT_CHAT_ID = "";
process.env.WHATSAPP_CHAT_ID = "1234567890@newsletter";
process.env.LOG_DIR = path.join(os.tmpdir(), "twb-sender-test-logs");

const { client } = await import("./client.js");
const { editMessage, sendMessage } = await import("./sender.js");
const { remember } = await import("./message-store.js");

client.emit("ready");

/** @type {string[]} */
let sent = [];

client.getChatById = async () => ({
  sendMessage: async (/** @type {string} */ content) => {
    sent.push(content);
    return { id: "wa-message-id" };
  },
});

let nextTelegramMsgId = 1;

/**
 * @param {(text: string) => Promise<unknown>} edit
 * @param {boolean} [hasMedia]
 */
function rememberMessage(edit, hasMedia = false) {
  const telegramMsgId = nextTelegramMsgId++;
  remember(telegramMsgId, /** @type {any} */ ({ edit }), hasMedia);
  return telegramMsgId;
}

beforeEach(() => {
  sent = [];
});

test("edits the existing WhatsApp message", async () => {
  /** @type {string[]} */
  const edits = [];
  const msgId = rememberMessage(async (text) => {
    edits.push(text);
    return { id: "wa-message-id" };
  });

  assert.equal(await editMessage("updated", msgId), true);
  assert.deepEqual(edits, ["updated"]);
  assert.deepEqual(sent, []);
});

test("does not post a copy when WhatsApp rejects the edit", async () => {
  const msgId = rememberMessage(async () => {
    throw new Error("r");
  });

  assert.equal(await editMessage("updated", msgId), false);
  assert.deepEqual(sent, []);
});

test("does not post a copy when the edit resolves null", async () => {
  const msgId = rememberMessage(async () => null);

  assert.equal(await editMessage("updated", msgId), false);
  assert.deepEqual(sent, []);
});

test("does not post a copy when the edit fails on a media caption", async () => {
  const msgId = rememberMessage(async () => {
    throw new Error("r");
  }, true);

  assert.equal(await editMessage("updated caption", msgId), false);
  assert.deepEqual(sent, []);
});

test("does not post a copy when the original message is unknown", async () => {
  assert.equal(await editMessage("updated", 999999), false);
  assert.deepEqual(sent, []);
});

test("still forwards new messages", async () => {
  assert.equal(await sendMessage("hello"), true);
  assert.deepEqual(sent, ["hello"]);
});
