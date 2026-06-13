const TELEGRAM_LINK =
  /(?:https?:\/\/)?(?:t(?:elegram)?\.me|telegram\.dog)\/[^\s)]+|tg:\/\/[^\s)]+/i;

const BLOCKED_KEYWORDS = ["розіграш"];

/**
 * @typedef {{ url?: string }} MessageEntity
 */

/**
 * @param {string|undefined} text
 * @param {MessageEntity[]|undefined} entities
 * @returns {boolean}
 */
const hasTelegramLink = (text, entities) => {
  if (text && TELEGRAM_LINK.test(text)) return true;
  return Boolean(
    entities?.some((entity) => entity.url && TELEGRAM_LINK.test(entity.url)),
  );
};

/**
 * @param {string|undefined} text
 * @returns {boolean}
 */
const hasBlockedKeyword = (text) => {
  if (!text) return false;
  const lowered = text.toLowerCase();
  return BLOCKED_KEYWORDS.some((keyword) => lowered.includes(keyword));
};

/**
 * Decide whether a Telegram message must NOT be forwarded to WhatsApp.
 * Blocks messages containing a Telegram link (plain text or hidden behind a
 * text_link entity) or any of the blocked keywords.
 *
 * @param {string|undefined} text
 * @param {MessageEntity[]|undefined} entities
 * @returns {boolean}
 */
export const shouldBlock = (text, entities) =>
  hasTelegramLink(text, entities) || hasBlockedKeyword(text);
