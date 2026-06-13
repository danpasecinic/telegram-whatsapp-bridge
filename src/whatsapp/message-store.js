/**
 * Tracks the WhatsApp message produced for each Telegram message id so that
 * later edits can be applied to the same WhatsApp message.
 *
 * @typedef {{ hasMedia: boolean }} MessageMeta
 */

/** @type {Map<number, import("whatsapp-web.js").Message>} */
const messageMap = new Map();

/** @type {Map<number, MessageMeta>} */
const messageMetaMap = new Map();

/**
 * @param {number} telegramMsgId
 * @param {import("whatsapp-web.js").Message} msg
 * @param {boolean} hasMedia
 */
export function remember(telegramMsgId, msg, hasMedia) {
  messageMap.set(telegramMsgId, msg);
  messageMetaMap.set(telegramMsgId, { hasMedia });
}

/**
 * @param {number} telegramMsgId
 * @returns {import("whatsapp-web.js").Message|undefined}
 */
export function getMessage(telegramMsgId) {
  return messageMap.get(telegramMsgId);
}

/**
 * @param {number} telegramMsgId
 * @returns {boolean}
 */
export function hadMedia(telegramMsgId) {
  return messageMetaMap.get(telegramMsgId)?.hasMedia ?? false;
}
