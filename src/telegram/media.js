import log from "../logger.js";

/**
 * @param {import("telegraf").Context} ctx
 * @param {string} fileId
 * @param {string} type
 * @returns {Promise<string|null>}
 */
async function getFileUrl(ctx, fileId, type) {
  try {
    const fileUrl = await ctx.telegram.getFileLink(fileId);
    return fileUrl.href;
  } catch (error) {
    log.error(`Failed to get ${type} link: ${error.message}`);
    return null;
  }
}

/**
 * @param {import("telegraf").Context} ctx
 * @param {any} post
 * @returns {Promise<string|null>}
 */
export async function getPhotoUrl(ctx, post) {
  if (!post.photo) return null;
  const fileId = post.photo[post.photo.length - 1].file_id;
  return getFileUrl(ctx, fileId, "photo");
}

/**
 * @param {import("telegraf").Context} ctx
 * @param {any} post
 * @returns {Promise<string|null>}
 */
export async function getVideoUrl(ctx, post) {
  if (!post.video) return null;
  return getFileUrl(ctx, post.video.file_id, "video");
}
