/**
 * @typedef {object} MessageEntity
 * @property {string} type
 * @property {number} offset
 * @property {number} length
 * @property {string} [url]
 */

const entityFormatters = {
  bold: (text) => `*${text}*`,
  italic: (text) => `_${text}_`,
  strikethrough: (text) => `~${text}~`,
  code: (text) => `\`${text}\``,
  pre: (text) => `\`\`\`${text}\`\`\``,
  /** @param {string} text @param {MessageEntity} entity */
  text_link: (text, entity) => `${text} (${entity.url})`,
  blockquote: (text) =>
    text
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n"),
};

/**
 * Convert Telegram message entities into WhatsApp-compatible markdown.
 *
 * @param {string} text
 * @param {MessageEntity[]|undefined} entities
 * @returns {string}
 */
export function formatMessage(text, entities) {
  if (!text || !entities?.length) return text;

  const sorted = [...entities].sort((a, b) => b.offset - a.offset);
  let result = text;

  for (const entity of sorted) {
    const formatter = entityFormatters[entity.type];
    if (!formatter) continue;

    const start = entity.offset;
    const end = entity.offset + entity.length;
    const segment = result.substring(start, end);
    result =
      result.substring(0, start) +
      formatter(segment, entity) +
      result.substring(end);
  }

  return result;
}
