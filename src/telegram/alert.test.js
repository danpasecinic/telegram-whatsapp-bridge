import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { Telegram } from "telegraf";

process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.TELEGRAM_ALERT_CHAT_ID = "42";
process.env.LOG_DIR = path.join(os.tmpdir(), "twb-alert-test-logs");

/** @type {Array<[string|number, string]>} */
let delivered = [];
let failDelivery = false;

Telegram.prototype.sendMessage = async function (chatId, text) {
  if (failDelivery) throw new Error("telegram down");
  delivered.push([chatId, text]);
  return /** @type {any} */ ({});
};

const { default: log } = await import("../logger.js");
const { alertOnErrors, flushAlerts } = await import("./alert.js");

alertOnErrors();

beforeEach(() => {
  delivered = [];
  failDelivery = false;
});

test("sends a Telegram DM for every logged error", async () => {
  log.error("Failed to forward media: boom");
  log.error("Failed to forward message: bang");
  await flushAlerts();

  assert.deepEqual(delivered, [
    ["42", "WhatsApp bridge error: Failed to forward media: boom"],
    ["42", "WhatsApp bridge error: Failed to forward message: bang"],
  ]);
});

test("does not repeat the same error within the window", async () => {
  log.error("repeated failure");
  log.error("repeated failure");
  await flushAlerts();

  assert.deepEqual(delivered, [
    ["42", "WhatsApp bridge error: repeated failure"],
  ]);
});

test("truncates alerts to fit Telegram's message limit", async () => {
  log.error("x".repeat(10000));
  await flushAlerts();

  assert.equal(delivered[0][1].length, 4000);
});

test("does not alert on warnings or info", async () => {
  log.warn("WhatsApp not ready, message skipped");
  log.info("Message forwarded to WhatsApp");
  await flushAlerts();

  assert.deepEqual(delivered, []);
});

test("a failed alert delivery does not trigger another alert", async () => {
  failDelivery = true;
  log.error("boom");
  await flushAlerts();
  failDelivery = false;
  await flushAlerts();

  assert.deepEqual(delivered, []);
});
